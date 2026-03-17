from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
from functools import lru_cache

# Add the ML_PROJ root directory to the path to import our ML models
# Current file is in AgriTrader/backend/app.py
# We need to go up two levels to reach ML_PROJ
current_dir = os.path.dirname(os.path.abspath(__file__))  # AgriTrader/backend
agritrader_dir = os.path.dirname(current_dir)             # AgriTrader
ml_proj_dir = os.path.dirname(agritrader_dir)             # ML_PROJ

sys.path.insert(0, ml_proj_dir)

# Change working directory to ML_PROJ so model files can be found
os.chdir(ml_proj_dir)

from AgriTrader_API import AgriTraderAPI
from historical_data_fetcher import historical_fetcher
from csv_historical_data import csv_data
from usda_pa_grain_scraper import usda_scraper

# Add daily updater for auto-updating CSV
sys.path.insert(0, ml_proj_dir)
from daily_data_updater import DailyDataUpdater

app = Flask(__name__)
# Configure CORS: allow local dev by default, and optionally a specific production origin
frontend_origin = os.getenv("FRONTEND_ORIGIN")
cors_origins = ["http://localhost:19006", "http://localhost:8081"]
if frontend_origin:
    cors_origins.append(frontend_origin)
CORS(app, resources={r"/api/*": {"origins": cors_origins}})

# Initialize the ML API
api = AgriTraderAPI()

# Initialize data updater
data_updater = DailyDataUpdater()

# Auto-update CSV on backend startup
print("\n[STARTUP] Checking for data updates...")
try:
    data_updater.run_daily_update()
except Exception as e:
    print(f"[WARNING] Data update failed: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(api.ml_models.models),
        'available_models': list(api.ml_models.models.keys()),
        'frontend_origin': frontend_origin,
    })

ALLOWED_CROPS = {"corn", "soybeans", "wheat"}
MAX_PREDICTION_DAYS = 30


@lru_cache(maxsize=256)
def _cached_prediction(crop: str, user_location: str, prediction_days: int, lat: float | None, lon: float | None):
    """In-memory cache for predictions keyed by core inputs."""
    return api.predict_crop_price(
        crop=crop,
        user_location=user_location,
        prediction_days=prediction_days,
        lat=lat,
        lon=lon,
    )


@app.route('/api/predict/<crop>', methods=['POST'])
def predict_price(crop):
    """Predict price for specific crop using REAL-TIME data"""
    try:
        crop = crop.lower()
        if crop not in ALLOWED_CROPS:
            return jsonify({"error": f"Unsupported crop '{crop}'", "allowed_crops": sorted(ALLOWED_CROPS)}), 400

        data = request.get_json() or {}
        
        user_location = data.get('location', 'PA')
        prediction_days = int(data.get('days', 1))
        if prediction_days < 1 or prediction_days > MAX_PREDICTION_DAYS:
            return jsonify({
                "error": "Invalid days value",
                "message": f"days must be between 1 and {MAX_PREDICTION_DAYS}",
            }), 400

        lat = data.get('lat')
        lon = data.get('lon')
        
        print(f"\n[PREDICTION REQUEST] Crop: {crop}, Location: {user_location}, Days: {prediction_days}")
        print("[FETCHING] Real-time market data...")

        # Use cached prediction if available for identical inputs
        result = _cached_prediction(crop, user_location, prediction_days, lat, lon)
        
        # Add real-time USDA local bids if available
        try:
            local_bid = usda_scraper.get_local_bids(crop, 'central')
            if local_bid:
                result['local_bid'] = local_bid['average']
                result['local_bid_source'] = 'USDA AMS PA Grain Report'
                print(f"[USDA BID] {crop} local bid: ${local_bid['average']:.2f}")
        except Exception as e:
            print(f"[WARNING] Could not fetch USDA local bid: {e}")
        
        print(f"[PREDICTION] {crop}: ${result.get('predicted_price', 0):.2f}")
        result.setdefault("diagnostics", {})
        result["diagnostics"].update({
            "crop": crop,
            "location": user_location,
            "days": prediction_days,
            "fallback_used": bool(result.get("fallback_used", False)),
        })
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR] Prediction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Prediction failed: {str(e)}'
        }), 500

@app.route('/api/predict/<crop>/graph', methods=['POST'])
def predict_price_graph(crop):
    """Get price predictions for graph display"""
    try:
        data = request.get_json() or {}
        
        user_location = data.get('location', 'PA')
        lat = data.get('lat')
        lon = data.get('lon')
        
        result = api.predict_price_graph(
            crop=crop,
            user_location=user_location,
            lat=lat,
            lon=lon
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': f'Graph prediction failed: {str(e)}'
        }), 500

@app.route('/api/predict/<crop>/historical', methods=['GET'])
def get_historical_prices(crop):
    """Get historical prices for chart"""
    try:
        days = request.args.get('days', 5, type=int)
        
        # For now, return mock historical data
        # In production, this would fetch from your historical data source
        historical_data = {
            'crop': crop,
            'prices': [
                {'date': '2024-10-06', 'price': 6.80},
                {'date': '2024-10-07', 'price': 6.85},
                {'date': '2024-10-08', 'price': 6.88},
                {'date': '2024-10-09', 'price': 6.92},
                {'date': '2024-10-10', 'price': 6.95}
            ]
        }
        
        return jsonify(historical_data)
        
    except Exception as e:
        return jsonify({
            'error': f'Historical data failed: {str(e)}'
        }), 500

@app.route('/api/historical/<crop>', methods=['GET'])
def get_historical_data(crop):
    """Get historical prices for a crop - Uses REAL PA data from CSV!"""
    try:
        days = request.args.get('days', 30, type=int)
        location = request.args.get('location', 'PA', type=str)
        
        # PRIORITY 1: Use YOUR real CSV data (actual PA prices!)
        prices = csv_data.get_historical_prices(crop, days, location)
        
        # Fallback: If CSV fails, use Yahoo Finance
        if not prices:
            print(f"CSV data unavailable, falling back to Yahoo Finance for {crop}")
            prices = historical_fetcher.get_historical_prices(crop, days, location)
        
        return jsonify({
            'crop': crop,
            'location': location,
            'prices': prices,
            'days': len(prices),
            'source': 'csv_data' if prices else 'yahoo_finance'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Historical data fetch failed: {str(e)}'
        }), 500

@app.route('/api/current/<crop>', methods=['GET'])
def get_current_price(crop):
    """Get current market price for a crop - Uses REAL PA data!"""
    try:
        location = request.args.get('location', 'PA', type=str)
        
        # Get most recent price from YOUR CSV
        price = csv_data.get_latest_price(crop, location)
        
        # Fallback to Yahoo Finance if CSV unavailable
        if price is None:
            price = historical_fetcher.get_current_price(crop, location)
        
        if price is None:
            return jsonify({'error': 'Could not fetch current price'}), 500
        
        # Get statistics for context
        stats = csv_data.get_price_statistics(crop, days=30)
        
        return jsonify({
            'crop': crop,
            'location': location,
            'current_price': price,
            'statistics': stats,
            'timestamp': 'latest_available',
            'source': 'csv_data'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Current price fetch failed: {str(e)}'
        }), 500

@app.route('/api/local-bids/<crop>', methods=['GET'])
def get_local_bids(crop):
    """Get local elevator bids from USDA PA Grain Report"""
    try:
        region = request.args.get('region', 'central', type=str).lower()
        
        # Fetch real USDA local bids
        bids = usda_scraper.get_local_bids(crop, region)
        
        if not bids:
            return jsonify({
                'error': f'Could not fetch local bids for {crop}',
                'message': 'Check if USDA report is available'
            }), 404
        
        return jsonify(bids)
        
    except Exception as e:
        return jsonify({
            'error': f'Local bids fetch failed: {str(e)}'
        }), 500

@app.route('/api/local-bids/<crop>/all-regions', methods=['GET'])
def get_all_regional_bids(crop):
    """Get local bids for all PA regions"""
    try:
        bids = usda_scraper.get_all_regional_bids(crop)
        
        if not bids:
            return jsonify({
                'error': f'Could not fetch regional bids for {crop}'
            }), 404
        
        return jsonify({
            'crop': crop,
            'regions': bids,
            'count': len(bids)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Regional bids fetch failed: {str(e)}'
        }), 500

@app.route('/api/local-bids/<crop>/statewide', methods=['GET'])
def get_statewide_average_bid(crop):
    """Get PA statewide average local bid"""
    try:
        result = usda_scraper.get_statewide_average(crop)
        
        if not result:
            return jsonify({
                'error': f'Could not calculate statewide average for {crop}'
            }), 404
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': f'Statewide average fetch failed: {str(e)}'
        }), 500

@app.route('/api/crops', methods=['GET'])
def get_available_crops():
    """Get list of available crops"""
    return jsonify({
        'crops': ['corn', 'soybeans', 'wheat'],
        'default_location': 'PA'
    })

@app.route('/api/locations', methods=['GET'])
def get_supported_locations():
    """Get list of supported locations"""
    return jsonify({
        'locations': ['PA', 'OH', 'IN', 'IL'],
        'default': 'PA'
    })

if __name__ == '__main__':
    print("="*60)
    print("[STARTUP] Starting AgriTrader ML Backend...")
    print("="*60)
    print("[MODELS] Available models:", list(api.ml_models.models.keys()))
    print("[DATA SOURCES]")
    print("  - Real-time CBOT futures (Yahoo Finance)")
    print("  - USDA PA Grain Bids (local elevator prices)")
    print("  - Historical CSV data (PA cash prices)")
    print("="*60)
    print("[API] Running on http://localhost:5000")
    print("[API] Health check: http://localhost:5000/api/health")
    print("[STATUS] Ready for React Native app!")
    print("="*60)
    
    # Test real-time data fetching on startup
    print("\n[STARTUP TEST] Fetching real-time market data...")
    try:
        test_prediction = api.predict_crop_price('corn', 'PA', 1)
        if 'predicted_price' in test_prediction:
            print(f"[OK] Corn prediction: ${test_prediction['predicted_price']:.2f}")
        else:
            print(f"[WARNING] Prediction returned: {test_prediction}")
    except Exception as e:
        print(f"[WARNING] Startup test failed: {e}")
    
    print("\n[READY] Waiting for requests...\n")
    
    # Debug mode disabled to prevent reloader path issues
    app.run(debug=False, host='0.0.0.0', port=5000)
