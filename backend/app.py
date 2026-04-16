from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import re
from datetime import datetime, timezone
from functools import lru_cache

# Resolve the ML project root directory.
# MODELS_DIR env var allows overriding on Northflank / Docker where the directory
# layout differs from local dev (e.g. MODELS_DIR=/app).
current_dir = os.path.dirname(os.path.abspath(__file__))  # AgriTrader/backend
agritrader_dir = os.path.dirname(current_dir)             # AgriTrader
ml_proj_dir = os.getenv("MODELS_DIR", os.path.dirname(agritrader_dir))  # ML_PROJ or override

sys.path.insert(0, ml_proj_dir)
sys.path.insert(0, current_dir)

os.chdir(ml_proj_dir)

from AgriTrader_API import AgriTraderAPI
from historical_data_fetcher import historical_fetcher
from csv_historical_data import csv_data
from usda_pa_grain_scraper import usda_scraper
from daily_data_updater import DailyDataUpdater

app = Flask(__name__)


def _build_cors_origins():
    """Browser origins: local dev, optional comma-separated env, and Vercel preview URL when backend runs on Vercel."""
    origins = {
        "http://localhost:19006",
        "http://localhost:8081",
        "http://127.0.0.1:19006",
        "http://127.0.0.1:8081",
    }
    for env_key in ("FRONTEND_ORIGIN", "CORS_ORIGINS"):
        raw = os.getenv(env_key, "")
        if not raw:
            continue
        for part in raw.split(","):
            o = part.strip().rstrip("/")
            if o:
                origins.add(o)
    vercel_url = os.getenv("VERCEL_URL", "").strip()
    if vercel_url:
        if vercel_url.startswith("http://") or vercel_url.startswith("https://"):
            origins.add(vercel_url.rstrip("/"))
        else:
            origins.add(f"https://{vercel_url.rstrip('/')}")
    return sorted(origins)


cors_origins = _build_cors_origins()
frontend_origin = os.getenv("FRONTEND_ORIGIN") or os.getenv("CORS_ORIGINS")
_cors_origin_pattern = os.getenv("CORS_ORIGIN_REGEX", "").strip()
if _cors_origin_pattern:
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": re.compile(_cors_origin_pattern),
                "supports_credentials": False,
            }
        },
    )
else:
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins,
                "supports_credentials": False,
            }
        },
    )

# Initialize the ML API
api = AgriTraderAPI()

# Initialize data updater
data_updater = DailyDataUpdater()

# Auto-update CSV on startup (skip on serverless / when disabled for faster cold starts)
if os.getenv("SKIP_STARTUP_DATA_UPDATE", "").lower() not in ("1", "true", "yes"):
    print("\n[STARTUP] Checking for data updates...")
    try:
        data_updater.run_daily_update()
    except Exception as e:
        print(f"[WARNING] Data update failed: {e}")
else:
    print("\n[STARTUP] SKIP_STARTUP_DATA_UPDATE set — skipping CSV update on startup.")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(api.ml_models.models),
        'available_models': list(api.ml_models.models.keys()),
        'frontend_origin': frontend_origin,
        'cors_origin_count': len(cors_origins),
        'cors_regex': bool(_cors_origin_pattern),
    })

ALLOWED_CROPS = {"corn", "soybeans", "wheat"}
MAX_PREDICTION_DAYS = 30


def _lat_lon_to_pa_region(lat: float, lon: float) -> str:
    """Map Pennsylvania coordinates to USDA grain report region (east/central/west).
    Boundaries are approximate county-level splits used by PA Ag Statistics.
    """
    # Non-PA coordinates fall back to central (most representative)
    if not (39.5 < lat < 42.5 and -80.6 < lon < -74.7):
        return 'central'
    if lon > -76.5:
        return 'east'
    elif lon > -78.0:
        return 'central'
    else:
        return 'west'


@lru_cache(maxsize=512)
def _cached_prediction(
    crop: str,
    user_location: str,
    prediction_days: int,
    lat: float | None,
    lon: float | None,
    as_of_date: str,
):
    """In-memory cache; as_of_date (UTC) refreshes inputs daily (weather/FRED/world)."""
    return api.predict_crop_price(
        crop=crop,
        user_location=user_location,
        prediction_days=prediction_days,
        lat=lat,
        lon=lon,
    )


def _get_usda_bid(crop: str, lat, lon):
    """Fetch the USDA local elevator bid for this crop + location.
    Returns the bid dict on success, None on any failure."""
    try:
        region = _lat_lon_to_pa_region(lat or 40.2737, lon or -76.8844)
        return usda_scraper.get_local_bids(crop, region), region
    except Exception as e:
        print(f"[WARNING] USDA bid lookup failed: {e}")
        return None, 'central'


def _calibrate_to_local_market(result: dict, usda_bid: float) -> dict:
    """
    Anchor the ML prediction to the actual local elevator bid.

    The ML model was trained on 2024–2025 baseline prices. Current PA
    elevator bids may diverge significantly from that baseline (different
    market cycle, basis changes, etc.).

    Strategy: additive basis adjustment.
      basis = usda_bid_today - ml_day1_price
      calibrated_future_N = ml_price_N + basis

    This preserves the ML model's predicted TREND (direction and dollar-
    magnitude of change over time) while anchoring the absolute price level
    to what the farmer can actually get at their local elevator today.
    """
    ml_price = result.get('predicted_price', 0)
    if ml_price <= 0:
        return result

    basis = usda_bid - ml_price
    if abs(basis) < 0.05:          # < 5 cents — no meaningful gap, skip
        return result

    result = dict(result)          # shallow copy — don't mutate the lru_cache dict
    ci_half = (result['confidence_upper'] - result['confidence_lower']) / 2.0
    result['predicted_price']  = round(usda_bid, 4)
    result['confidence_lower'] = round(usda_bid - ci_half, 4)
    result['confidence_upper'] = round(usda_bid + ci_half, 4)
    result['ml_raw_price']     = round(ml_price, 4)  # keep original for diagnostics
    result['basis_applied']    = round(basis, 4)
    print(f"[CALIBRATED] ML=${ml_price:.2f} + basis=${basis:+.2f} -> ${usda_bid:.2f}")
    return result


def _calibrate_graph_to_local_market(graph: dict, usda_bid: float) -> dict:
    """
    Apply the same basis adjustment to every data point in the graph.
    Preserves the ML trend shape while anchoring day-1 to the USDA bid.
    """
    pts = graph.get('data_points', [])
    if not pts:
        return graph

    ml_day1 = pts[0].get('predicted_price', 0)
    if ml_day1 <= 0:
        return graph

    basis = usda_bid - ml_day1
    if abs(basis) < 0.05:
        return graph

    graph = dict(graph)
    graph['data_points'] = [
        {
            **pt,
            'predicted_price':  round(pt['predicted_price']  + basis, 4),
            'confidence_lower': round(pt['confidence_lower'] + basis, 4),
            'confidence_upper': round(pt['confidence_upper'] + basis, 4),
        }
        for pt in pts
    ]
    graph['current_price'] = round(graph.get('current_price', ml_day1) + basis, 4)
    if graph.get('peak_price'):
        graph['peak_price'] = round(graph['peak_price'] + basis, 4)
    graph['ml_basis_applied'] = round(basis, 4)
    print(f"[CALIBRATED GRAPH] basis={basis:+.2f}  day1: ${ml_day1:.2f} -> ${usda_bid:.2f}")
    return graph


@app.route('/api/predict/<crop>', methods=['POST'])
def predict_price(crop):
    """Predict price for specific crop, anchored to current local elevator bid."""
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

        as_of = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        result = dict(_cached_prediction(crop, user_location, prediction_days, lat, lon, as_of))

        # Fetch local elevator bid and calibrate
        local_bid_data, region = _get_usda_bid(crop, lat, lon)
        if local_bid_data:
            result['local_bid']        = local_bid_data['average']
            result['local_bid_low']    = local_bid_data.get('low')
            result['local_bid_high']   = local_bid_data.get('high')
            result['local_bid_region'] = region
            result['local_bid_source'] = 'USDA AMS PA Grain Report'
            print(f"[USDA BID] {crop} ({region} PA): ${local_bid_data['average']:.2f}")

            # Anchor ML prediction to actual local market price
            result = _calibrate_to_local_market(result, local_bid_data['average'])

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
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/api/predict/<crop>/graph', methods=['POST'])
def predict_price_graph(crop):
    """Get multi-month price forecast anchored to the last historical CSV price.

    The frontend chart concatenates historical CSV prices with predicted prices.
    To avoid a visible cliff at the transition, we anchor predictions to the
    last known CSV price (which is the last point the user sees on the chart).
    The ML model's predicted *trend* (direction and magnitude) is preserved —
    only the absolute price level shifts to ensure continuity.
    """
    try:
        data = request.get_json() or {}
        user_location = data.get('location', 'PA')
        lat = data.get('lat')
        lon = data.get('lon')

        result = api.predict_price_graph(
            crop=crop,
            user_location=user_location,
            lat=lat,
            lon=lon,
        )

        # --- Anchor to last CSV price for chart continuity ---
        # The chart shows historical CSV prices then predictions; the anchor
        # must match the historical source so there is no visual jump.
        csv_anchor = csv_data.get_latest_price(crop, user_location)

        if csv_anchor is not None and csv_anchor > 0:
            result = _calibrate_graph_to_local_market(result, csv_anchor)
            result['anchor_source'] = 'csv_historical'
            result['anchor_price'] = csv_anchor
            print(f"[GRAPH] Anchored {crop} predictions to CSV last price ${csv_anchor:.2f}")
        else:
            # CSV unavailable — fall back to USDA bid so predictions are
            # at least in the right ballpark vs current market.
            local_bid_data, region = _get_usda_bid(crop, lat, lon)
            if local_bid_data:
                result['local_bid']        = local_bid_data['average']
                result['local_bid_region'] = region
                result = _calibrate_graph_to_local_market(result, local_bid_data['average'])
                result['anchor_source'] = 'usda_bid'
                print(f"[GRAPH] CSV unavailable; anchored {crop} to USDA bid ${local_bid_data['average']:.2f}")
            else:
                result['anchor_source'] = 'ml_raw'
                print(f"[GRAPH] No anchor available for {crop}; using raw ML output")

        # Include USDA bid for informational display even when CSV is the anchor
        if 'local_bid' not in result:
            local_bid_data, region = _get_usda_bid(crop, lat, lon)
            if local_bid_data:
                result['local_bid']        = local_bid_data['average']
                result['local_bid_region'] = region

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'Graph prediction failed: {str(e)}'}), 500

@app.route('/api/predict/<crop>/historical', methods=['GET'])
def get_historical_prices(crop):
    """Get historical prices for chart (same sources as /api/historical/<crop>)."""
    try:
        days = request.args.get('days', 30, type=int)
        days = max(1, min(days, 730))
        location = request.args.get('location', 'PA', type=str)

        prices = csv_data.get_historical_prices(crop, days, location)
        source = "csv_data"
        if not prices:
            prices = historical_fetcher.get_historical_prices(crop, days, location)
            source = "yahoo_finance"

        return jsonify({
            "crop": crop,
            "location": location,
            "prices": prices,
            "days": len(prices),
            "source": source,
        })
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
        
        days = max(1, min(int(days), 730))

        # PRIORITY 1: Use YOUR real CSV data (actual PA prices!)
        prices = csv_data.get_historical_prices(crop, days, location)
        source = "csv_data"

        # Fallback: If CSV fails, use Yahoo Finance
        if not prices:
            print(f"CSV data unavailable, falling back to Yahoo Finance for {crop}")
            prices = historical_fetcher.get_historical_prices(crop, days, location)
            source = "yahoo_finance"

        return jsonify({
            'crop': crop,
            'location': location,
            'prices': prices,
            'days': len(prices),
            'source': source,
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
        source = "csv_data"

        # Fallback to Yahoo Finance if CSV unavailable
        if price is None:
            price = historical_fetcher.get_current_price(crop, location)
            source = "yahoo_finance"

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
            'source': source,
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
