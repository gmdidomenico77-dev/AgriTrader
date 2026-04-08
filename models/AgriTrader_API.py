"""
AgriTrader API Interface
Simplified interface for integrating ML models into your backend
"""

import json
import os
import math
import time
import pandas as pd
import numpy as np
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from AgriTrader_ML_Models import AgriTraderMLModels

_TRAINING_FEATURE_STATS = None

_feature_cache: dict = {}
_CACHE_TTL = 300  # seconds


def _training_feature_stats():
    """Mean/std from NORMAL_VALS_ml_training_data.csv for z-scoring live inputs (same space as SCALED training features)."""
    global _TRAINING_FEATURE_STATS
    if _TRAINING_FEATURE_STATS is not None:
        return _TRAINING_FEATURE_STATS
    _TRAINING_FEATURE_STATS = {}
    base = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base, "NORMAL_VALS_ml_training_data.csv"),
        "NORMAL_VALS_ml_training_data.csv",
    ]
    path = next((p for p in candidates if os.path.isfile(p)), None)
    if not path:
        return _TRAINING_FEATURE_STATS
    try:
        df = pd.read_csv(path)
        for col in (
            "temperature_2m_max",
            "precipitation_sum",
            "gdd_cumulative",
            "drought_index",
            "10yr_treasury",
            "unemployment_rate",
            "cpi",
            "usd_eur",
            "corn_world_price",
            "soy_world_price",
            "wheat_world_price",
        ):
            if col not in df.columns:
                continue
            s = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s) < 2:
                continue
            std = float(s.std())
            if std < 1e-9:
                std = 1.0
            _TRAINING_FEATURE_STATS[col] = (float(s.mean()), std)
    except Exception as e:
        print(f"[WARN] Could not load training feature stats: {e}")
    return _TRAINING_FEATURE_STATS


def _zscore(col, value, stats):
    if value is None or col not in stats:
        return 0.0
    mean, std = stats[col]
    if std < 1e-9:
        return 0.0
    return float((value - mean) / std)


def _safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_location_code(user_location):
    """Map free-text locations to supported state codes used by location_factors."""
    if not user_location:
        return "PA"
    raw = str(user_location).strip()
    upper = raw.upper()
    supported = {"PA", "OH", "IN", "IL"}
    if upper in supported:
        return upper
    if "," in upper:
        tail = upper.split(",")[-1].strip()
        if tail in supported:
            return tail
    mapping = {
        "PENNSYLVANIA": "PA",
        "OHIO": "OH",
        "INDIANA": "IN",
        "ILLINOIS": "IL",
    }
    for name, code in mapping.items():
        if name in upper:
            return code
    return "PA"

class AgriTraderAPI:
    """
    Simple API interface for AgriTrader app
    Handles user-specific predictions and location-based adjustments
    """
    
    def __init__(self):
        self.ml_models = AgriTraderMLModels()
        self.load_models()
        
        self.unscaling_params = self._load_unscaling_params()
        
        # Location-specific adjustments (can be expanded)
        self.location_factors = {
            'PA': {'corn': 0.98, 'soybeans': 0.97, 'wheat': 0.99},  # Pennsylvania
            'OH': {'corn': 1.02, 'soybeans': 1.01, 'wheat': 1.00},  # Ohio  
            'IN': {'corn': 1.01, 'soybeans': 1.00, 'wheat': 0.98},  # Indiana
            'IL': {'corn': 1.00, 'soybeans': 1.00, 'wheat': 1.00},  # Illinois (baseline)
        }
    
    @staticmethod
    def _load_unscaling_params():
        """Read mean/std for target columns from the NORMAL_VALS CSV so unscaling
        stays in sync with whatever training data was used."""
        defaults = {
            'corn':     {'mean': 4.31, 'std': 0.30},
            'soybeans': {'mean': 10.69, 'std': 0.84},
            'wheat':    {'mean': 5.56, 'std': 0.38},
        }
        base = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(base, "NORMAL_VALS_ml_training_data.csv"),
            "NORMAL_VALS_ml_training_data.csv",
        ]
        path = next((p for p in candidates if os.path.isfile(p)), None)
        if not path:
            print("[WARN] NORMAL_VALS CSV not found — using fallback unscaling params")
            return defaults
        try:
            df = pd.read_csv(path)
            col_map = {
                'corn': 'alt_corn_cash_price',
                'soybeans': 'alt_soybeans_cash_price',
                'wheat': 'alt_wheat_cash_price',
            }
            params = {}
            for crop, col in col_map.items():
                if col not in df.columns:
                    params[crop] = defaults[crop]
                    continue
                s = pd.to_numeric(df[col], errors='coerce').dropna()
                if len(s) >= 2:
                    std_val = float(s.std())
                    if std_val < 1e-9:
                        std_val = defaults[crop]['std']
                    params[crop] = {'mean': float(s.mean()), 'std': std_val}
                else:
                    params[crop] = defaults[crop]
            summary = {k: f"mu={v['mean']:.4f} std={v['std']:.4f}" for k, v in params.items()}
            print(f"[INFO] Unscaling params loaded from CSV: {summary}")
            return params
        except Exception as e:
            print(f"[WARN] Failed to read unscaling params from CSV: {e}")
            return defaults

    def unscale_price(self, scaled_price, crop):
        """
        Convert scaled prediction back to real dollar price
        Formula: real_price = (scaled_price * std) + mean
        """
        params = self.unscaling_params[crop]
        real_price = (scaled_price * params['std']) + params['mean']
        return real_price
    
    def load_models(self):
        """Load the trained models"""
        try:
            self.ml_models.load_models()
            
            # Load metadata to get feature columns
            import json
            with open('agritrader_model_metadata.json', 'r') as f:
                metadata = json.load(f)
                self.ml_models.feature_columns = metadata.get('feature_columns', [])
                self.ml_models.target_columns = metadata.get('target_columns', {})
            
            print("Models loaded successfully")
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def get_current_weather_data(self, lat, lon):
        """
        Weather features in the same z-score space as training (via NORMAL_VALS stats).
        Uses Open-Meteo (no API key). Falls back to neutral zeros if the request fails.
        """
        stats = _training_feature_stats()
        lat_f = _safe_float(lat) if lat is not None else 40.2737
        lon_f = _safe_float(lon) if lon is not None else -76.8844
        if lat_f is None:
            lat_f = 40.2737
        if lon_f is None:
            lon_f = -76.8844

        z_temp = z_precip = 0.0
        try:
            url = (
                "https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat_f}&longitude={lon_f}"
                "&daily=temperature_2m_max,precipitation_sum"
                "&past_days=7&forecast_days=1"
            )
            r = requests.get(url, timeout=12)
            r.raise_for_status()
            daily = r.json().get("daily") or {}
            t_series = daily.get("temperature_2m_max") or []
            p_series = daily.get("precipitation_sum") or []
            t_vals = [float(x) for x in t_series if x is not None]
            p_vals = [float(x) for x in p_series if x is not None]
            if t_vals:
                z_temp = _zscore("temperature_2m_max", sum(t_vals) / len(t_vals), stats)
            if p_vals:
                mean_daily_p = sum(p_vals) / len(p_vals)
                z_precip = _zscore("precipitation_sum", mean_daily_p, stats)
        except Exception as e:
            print(f"[WARN] Open-Meteo weather fetch failed: {e}")

        doy = datetime.now().timetuple().tm_yday
        seasonal = 0.3 * math.sin(2 * math.pi * (doy - 100) / 365.0)
        gdd_z = float(np.clip(0.55 * z_temp + 0.35 * seasonal + 0.15 * z_precip, -2.5, 2.5))
        drought_z = float(np.clip(-0.55 * z_precip + 0.18 * z_temp, -2.5, 2.5))

        return {
            "temperature_2m_max": z_temp,
            "precipitation_sum": z_precip,
            "gdd_cumulative": gdd_z,
            "drought_index": drought_z,
        }

    def get_current_economic_data(self):
        """
        Economic features z-scored vs NORMAL_VALS training distribution.
        Set FRED_API_KEY for live St. Louis Fed data; otherwise returns neutral zeros.
        """
        stats = _training_feature_stats()
        out = {
            "10yr_treasury": 0.0,
            "unemployment_rate": 0.0,
            "cpi": 0.0,
            "usd_eur": 0.0,
        }
        key = os.getenv("FRED_API_KEY", "").strip()

        def _fred_latest(series_id):
            # Public CSV endpoint — fetch via requests so we can enforce a timeout
            # (pd.read_csv with a URL has no timeout and can hang forever if blocked)
            try:
                csv_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
                r = requests.get(csv_url, timeout=8)
                r.raise_for_status()
                from io import StringIO
                df = pd.read_csv(StringIO(r.text))
                if "VALUE" in df.columns:
                    s = pd.to_numeric(df["VALUE"], errors="coerce").dropna()
                    if len(s) > 0:
                        return float(s.iloc[-1])
            except Exception:
                pass

            # Optional API key path as fallback
            if key:
                u = (
                    "https://api.stlouisfed.org/fred/series/observations"
                    f"?series_id={series_id}&api_key={key}&file_type=json&sort_order=desc&limit=1"
                )
                rr = requests.get(u, timeout=12)
                rr.raise_for_status()
                obs = rr.json().get("observations") or []
                if obs:
                    v = obs[0].get("value")
                    if v is not None and v != ".":
                        return float(v)
            return None

        try:
            dgs = _fred_latest("DGS10")
            unrate = _fred_latest("UNRATE")
            cpi = _fred_latest("CPIAUCSL")
            dex = _fred_latest("DEXUSEU")
            if dgs is not None:
                out["10yr_treasury"] = _zscore("10yr_treasury", dgs, stats)
            if unrate is not None:
                out["unemployment_rate"] = _zscore("unemployment_rate", unrate, stats)
            if cpi is not None:
                out["cpi"] = _zscore("cpi", cpi, stats)
            if dex is not None:
                out["usd_eur"] = _zscore("usd_eur", dex, stats)
        except Exception as e:
            print(f"[WARN] FRED economic fetch failed: {e}")
        return out
    
    def get_world_prices(self):
        """
        Get current world commodity prices from Yahoo Finance
        Fetches REAL-TIME CBOT futures prices
        """
        try:
            import yfinance as yf
            from datetime import datetime
            
            # CBOT futures symbols
            symbols = {
                'corn_world_price': 'ZC=F',    # Corn futures
                'soy_world_price': 'ZS=F',     # Soybean futures  
                'wheat_world_price': 'ZW=F'    # Wheat futures
            }
            
            stats = _training_feature_stats()
            world_prices = {}
            
            for key, symbol in symbols.items():
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period='5d')
                    
                    if len(hist) > 0:
                        latest_price = float(hist["Close"].iloc[-1])
                        if latest_price > 35:
                            latest_price = latest_price / 100.0

                        scaled_price = _zscore(key, latest_price, stats)
                        world_prices[key] = scaled_price
                        
                        print(f"[REAL-TIME] {key}: ${latest_price:.2f}/bu (z-score: {scaled_price:.3f})")
                    else:
                        world_prices[key] = 0.0
                        print(f"[FALLBACK] {key}: Using neutral value")
                        
                except Exception as e:
                    print(f"[WARNING] Could not fetch {symbol}: {e}")
                    world_prices[key] = 0.0
            
            return world_prices
            
        except ImportError:
            print("[WARNING] yfinance not available, using fallback values")
            # Fallback to current market conditions (October 2025)
            return {
                'corn_world_price': 0.0,      # Near baseline
                'soy_world_price': 0.1,       # Slightly above baseline
                'wheat_world_price': -0.05    # Slightly below baseline
            }
        except Exception as e:
            print(f"[ERROR] get_world_prices failed: {e}")
            return {
                'corn_world_price': 0.0,
                'soy_world_price': 0.0,
                'wheat_world_price': 0.0
            }
    
    def prepare_features(self, user_location, lat=None, lon=None):
        """
        Prepare feature vector for prediction based on user location and current data.
        External API calls run in parallel; results are cached for 5 minutes.
        """
        global _feature_cache
        cache_key = f"{lat}_{lon}"
        now = time.time()
        if cache_key in _feature_cache:
            cached_time, cached_features = _feature_cache[cache_key]
            if now - cached_time < _CACHE_TTL:
                return {**cached_features, 'day_of_year': datetime.now().timetuple().tm_yday}

        with ThreadPoolExecutor(max_workers=3) as ex:
            f_weather = ex.submit(self.get_current_weather_data, lat, lon)
            f_econ    = ex.submit(self.get_current_economic_data)
            f_world   = ex.submit(self.get_world_prices)

        features = {**f_weather.result(), **f_econ.result(), **f_world.result()}
        _feature_cache[cache_key] = (now, features)
        features['day_of_year'] = datetime.now().timetuple().tm_yday
        
        return features
    
    def predict_crop_price(self, crop, user_location, prediction_days=1, lat=None, lon=None):
        """
        Main prediction function for the app
        
        Args:
            crop: 'corn', 'soybeans', or 'wheat'
            user_location: State code (e.g., 'PA', 'OH', 'IN')
            prediction_days: Number of days to predict ahead
            lat, lon: User coordinates (optional)
        
        Returns:
            Dictionary with prediction results
        """
        try:
            # Validate crop
            if crop not in ['corn', 'soybeans', 'wheat']:
                return {'error': 'Invalid crop. Must be corn, soybeans, or wheat.'}
            
            # Prepare features
            features = self.prepare_features(user_location, lat, lon)
            
            # Make prediction (returns SCALED values)
            prediction = self.ml_models.predict_price(crop, features, prediction_days)
            
            # UNSCALE predictions to real dollar prices
            prediction['predicted_price'] = self.unscale_price(prediction['predicted_price'], crop)
            prediction['confidence_lower'] = self.unscale_price(prediction['confidence_lower'], crop)
            prediction['confidence_upper'] = self.unscale_price(prediction['confidence_upper'], crop)
            
            # Apply location-specific adjustment
            location_code = _normalize_location_code(user_location)
            if location_code in self.location_factors:
                location_factor = self.location_factors[location_code][crop]
                prediction['predicted_price'] *= location_factor
                prediction['confidence_lower'] *= location_factor
                prediction['confidence_upper'] *= location_factor
            
            # Add location and recommendation
            prediction['location'] = location_code
            prediction['recommendation'] = self.get_recommendation(prediction)
            prediction['market_analysis'] = self.get_market_analysis(crop, prediction)
            
            return prediction
            
        except Exception as e:
            return {'error': f'Prediction failed: {str(e)}'}
    
    def predict_price_graph(self, crop, user_location, lat=None, lon=None):
        """
        Get predictions for multiple days (for the app's graph display)
        Now provides 6-month predictions with 6 evenly-spaced data points
        """
        try:
            features = self.prepare_features(user_location, lat, lon)
            
            # Get predictions for different time horizons - 6 months with 6 data points
            # Points at: today, 1 month, 2 months, 3 months, 4 months, 5 months, 6 months
            days_list = [1, 30, 60, 90, 120, 150, 180]
            predictions = self.ml_models.predict_multiple_days(crop, features, days_list)
            
            # UNSCALE all predictions to real dollar prices
            for i, pred in enumerate(predictions):
                pred['predicted_price'] = self.unscale_price(pred['predicted_price'], crop)
                pred['confidence_lower'] = self.unscale_price(pred['confidence_lower'], crop)
                pred['confidence_upper'] = self.unscale_price(pred['confidence_upper'], crop)
                
                # REMOVED linear upward trend - let models predict based on market fundamentals
                # Seasonal patterns and market dynamics should drive predictions, not artificial trends
            
            # Apply location adjustments
            location_code = _normalize_location_code(user_location)
            if location_code in self.location_factors:
                location_factor = self.location_factors[location_code][crop]
                for pred in predictions:
                    pred['predicted_price'] *= location_factor
                    pred['confidence_lower'] *= location_factor
                    pred['confidence_upper'] *= location_factor
            
            # Calculate trends for near-term and long-term
            near_term_trend = self.calculate_trend(predictions[:3]) if len(predictions) >= 3 else 'Stable'  # First month
            long_term_trend = self.calculate_trend(predictions[-3:]) if len(predictions) >= 3 else 'Stable'  # Last month
            
            # Format for graph display
            graph_data = {
                'crop': crop,
                'location': location_code,
                'data_points': predictions,
                'current_price': predictions[0]['predicted_price'] if predictions else 0,
                'trend': self.calculate_trend(predictions),
                'near_term_trend': near_term_trend,
                'long_term_trend': long_term_trend,
                'volatility': self.calculate_volatility(predictions),
                'peak_price': max([p['predicted_price'] for p in predictions]) if predictions else 0,
                'recommended_sell_time': self.get_optimal_sell_time(predictions, crop)
            }
            
            return graph_data
            
        except Exception as e:
            return {'error': f'Graph prediction failed: {str(e)}'}
    
    def get_recommendation(self, prediction):
        """
        Generate buy/sell/hold recommendation based on prediction
        Now using REAL prices (not scaled)
        """
        price = prediction['predicted_price']
        confidence = prediction['model_confidence']
        
        # Get crop type from prediction context
        # For now, use simple logic based on price ranges
        # TODO: Could be improved with market context
        
        # Simple recommendation logic (can be made more sophisticated)
        if confidence > 0.8:  # High confidence
            # Compare to confidence bounds
            price_range = prediction['confidence_upper'] - prediction['confidence_lower']
            mid_point = (prediction['confidence_upper'] + prediction['confidence_lower']) / 2
            
            if price > mid_point + (price_range * 0.2):  # Price trending up
                return {
                    'action': 'Hold',  # Wait for peak
                    'confidence': 'High',
                    'confidence_percentage': int(confidence * 100)
                }
            elif price < mid_point - (price_range * 0.2):  # Price trending down
                return {
                    'action': 'Sell',  # Sell before further decline
                    'confidence': 'High',
                    'confidence_percentage': int(confidence * 100)
                }
            else:
                return {
                    'action': 'Hold',
                    'confidence': 'High',
                    'confidence_percentage': int(confidence * 100)
                }
        else:  # Lower confidence
            return {
                'action': 'Hold',
                'confidence': 'Medium',
                'confidence_percentage': int(confidence * 100)
            }
    
    def get_optimal_sell_time(self, predictions, crop):
        """
        Analyze predictions over 6 months to determine optimal selling time
        Returns recommendation based on price patterns
        """
        if not predictions or len(predictions) < 3:
            return "Within 1-2 weeks"
        
        prices = [p['predicted_price'] for p in predictions]
        dates = [p.get('date', '') for p in predictions]
        
        # Find peak price and when it occurs
        peak_idx = prices.index(max(prices))
        peak_price = max(prices)
        current_price = prices[0]
        
        # Calculate price change from current to peak
        price_increase = ((peak_price - current_price) / current_price) * 100
        
        # Determine selling recommendation
        if price_increase > 10:  # Significant potential gain
            if peak_idx < len(dates) / 2:  # Peak is in first half
                return f"Within {predictions[peak_idx]['days_ahead']} days"
            else:
                return f"In {predictions[peak_idx]['days_ahead'] // 30} months"
        elif price_increase > 5:  # Moderate gain
            return f"Within {predictions[min(peak_idx + 1, len(predictions) - 1)]['days_ahead'] // 30} months"
        else:  # Small or negative change
            return "Consider selling soon if near break-even"
    
    def get_market_analysis(self, crop, prediction):
        """
        Generate market analysis for the UI
        Now using REAL prices
        """
        price = prediction['predicted_price']
        
        # Get historical average for this crop
        historical_avg = self.unscaling_params[crop]['mean']
        
        # Determine trend (compare to historical average)
        price_vs_avg = price / historical_avg
        if price_vs_avg > 1.05:  # 5% above historical average
            trend = 'Upward'
        elif price_vs_avg < 0.95:  # 5% below historical average
            trend = 'Downward'
        else:
            trend = 'Stable'
        
        # Determine volatility (simplified) - using REAL dollar ranges
        volatility_range = prediction['confidence_upper'] - prediction['confidence_lower']
        crop_std = self.unscaling_params[crop]['std']
        
        if volatility_range > crop_std * 0.5:  # More than 0.5 std devs
            volatility = 'High'
        elif volatility_range > crop_std * 0.25:  # 0.25-0.5 std devs
            volatility = 'Medium'
        else:
            volatility = 'Low'
        
        # Best selling time (simplified logic)
        if trend == 'Upward':
            best_time = 'Next 2-3 weeks'
        elif trend == 'Downward':
            best_time = 'Immediately'
        else:
            best_time = 'Within 1 week'
        
        return {
            'trend': trend,
            'volatility': volatility,
            'best_selling_time': best_time
        }
    
    def calculate_trend(self, predictions):
        """Calculate price trend from multiple predictions"""
        if len(predictions) < 2:
            return 'Stable'
        
        prices = [p['predicted_price'] for p in predictions]
        if prices[-1] > prices[0] * 1.02:
            return 'Upward'
        elif prices[-1] < prices[0] * 0.98:
            return 'Downward'
        else:
            return 'Stable'
    
    def calculate_volatility(self, predictions):
        """Calculate market volatility"""
        if len(predictions) < 2:
            return 'Low'
        
        prices = [p['predicted_price'] for p in predictions]
        price_std = np.std(prices)
        
        if price_std > 0.2:
            return 'High'
        elif price_std > 0.1:
            return 'Medium'
        else:
            return 'Low'

# Flask API endpoints (example)
def create_flask_app():
    """Create Flask app with API endpoints"""
    from flask import Flask, request, jsonify
    app = Flask(__name__)
    
    # Initialize API
    api = AgriTraderAPI()
    
    @app.route('/predict/<crop>', methods=['POST'])
    def predict_price(crop):
        """Predict price for specific crop"""
        data = request.get_json()
        
        user_location = data.get('location', 'PA')
        prediction_days = data.get('days', 1)
        lat = data.get('lat')
        lon = data.get('lon')
        
        result = api.predict_crop_price(crop, user_location, prediction_days, lat, lon)
        return jsonify(result)
    
    @app.route('/predict/<crop>/graph', methods=['POST'])
    def predict_price_graph(crop):
        """Get price predictions for graph display"""
        data = request.get_json()
        
        user_location = data.get('location', 'PA')
        lat = data.get('lat')
        lon = data.get('lon')
        
        result = api.predict_price_graph(crop, user_location, lat, lon)
        return jsonify(result)
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'models_loaded': len(api.ml_models.models)})
    
    return app

# Example usage
if __name__ == "__main__":
    # Test the API
    print("Testing AgriTrader API...")
    
    api = AgriTraderAPI()
    
    # Test single prediction
    print("\n=== Single Prediction Test ===")
    result = api.predict_crop_price('corn', 'PA', prediction_days=1)
    print(f"Corn prediction: {result}")
    
    # Test graph predictions
    print("\n=== Graph Prediction Test ===")
    graph_result = api.predict_price_graph('corn', 'PA')
    print(f"Graph data: {json.dumps(graph_result, indent=2)}")
