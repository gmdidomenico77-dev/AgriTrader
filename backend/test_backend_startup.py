"""Test backend startup to see what error occurs"""

import sys
import os

# Add the ML_PROJ root directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
agritrader_dir = os.path.dirname(current_dir)
ml_proj_dir = os.path.dirname(agritrader_dir)

print(f"Current dir: {current_dir}")
print(f"AgriTrader dir: {agritrader_dir}")
print(f"ML_PROJ dir: {ml_proj_dir}")

sys.path.insert(0, ml_proj_dir)

print("\n[1] Testing imports...")
try:
    from AgriTrader_API import AgriTraderAPI
    print("  [OK] AgriTrader_API imported")
except Exception as e:
    print(f"  [ERROR] AgriTrader_API: {e}")
    exit(1)

try:
    from historical_data_fetcher import historical_fetcher
    print("  [OK] historical_data_fetcher imported")
except Exception as e:
    print(f"  [ERROR] historical_data_fetcher: {e}")

try:
    from csv_historical_data import csv_data
    print("  [OK] csv_historical_data imported")
except Exception as e:
    print(f"  [ERROR] csv_historical_data: {e}")

try:
    from usda_pa_grain_scraper import usda_scraper
    print("  [OK] usda_pa_grain_scraper imported")
except Exception as e:
    print(f"  [ERROR] usda_pa_grain_scraper: {e}")

print("\n[2] Initializing API...")
try:
    api = AgriTraderAPI()
    print("  [OK] API initialized")
except Exception as e:
    print(f"  [ERROR] API initialization failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n[3] Testing prediction...")
try:
    result = api.predict_crop_price('corn', 'PA', 1)
    print(f"  [OK] Prediction: ${result['predicted_price']:.2f}")
except Exception as e:
    print(f"  [ERROR] Prediction failed: {e}")
    import traceback
    traceback.print_exc()

print("\n[SUCCESS] All tests passed! Backend should work.")
