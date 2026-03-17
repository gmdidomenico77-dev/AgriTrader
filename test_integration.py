#!/usr/bin/env python3
"""
Test script to verify AgriTrader ML integration is working
"""

import sys
import os
import requests
import json
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_backend_health():
    """Test if the backend API is healthy"""
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"Backend Health Check: {data['status']}")
            print(f"   Models loaded: {data['models_loaded']}")
            print(f"   Available models: {data['available_models']}")
            return True
        else:
            print(f"Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Backend not responding: {e}")
        return False

def test_prediction_endpoint(crop):
    """Test prediction endpoint for a specific crop"""
    try:
        response = requests.post(
            f'http://localhost:5000/api/predict/{crop}',
            json={'location': 'PA', 'days': 1},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"{crop.capitalize()} Prediction:")
            print(f"   Price: ${data['predicted_price']:.2f}")
            print(f"   Confidence: {data['model_confidence']:.1%}")
            print(f"   Recommendation: {data['recommendation']['action']}")
            print(f"   Trend: {data['market_analysis']['trend']}")
            return True
        else:
            print(f"{crop.capitalize()} prediction failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"{crop.capitalize()} prediction error: {e}")
        return False

def test_graph_endpoint(crop):
    """Test graph endpoint for a specific crop"""
    try:
        response = requests.post(
            f'http://localhost:5000/api/predict/{crop}/graph',
            json={'location': 'PA'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"{crop.capitalize()} Graph Data:")
            print(f"   Data points: {len(data['data_points'])}")
            print(f"   Current price: ${data['current_price']:.2f}")
            print(f"   Trend: {data['trend']}")
            return True
        else:
            print(f"{crop.capitalize()} graph data failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"{crop.capitalize()} graph data error: {e}")
        return False

def main():
    print("AgriTrader ML Integration Test")
    print("=" * 50)
    
    # Wait a moment for backend to start
    print("Waiting for backend to start...")
    time.sleep(3)
    
    # Test backend health
    if not test_backend_health():
        print("\nBackend is not running. Please start it first:")
        print("   python AgriTrader/start_agritrader.py")
        return
    
    print("\nTesting Crop Predictions...")
    crops = ['corn', 'soybeans', 'wheat']
    
    all_tests_passed = True
    
    for crop in crops:
        print(f"\n--- Testing {crop.capitalize()} ---")
        
        # Test prediction endpoint
        if not test_prediction_endpoint(crop):
            all_tests_passed = False
        
        # Test graph endpoint
        if not test_graph_endpoint(crop):
            all_tests_passed = False
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("All tests passed! ML integration is working perfectly!")
        print("\nNext steps:")
        print("1. Start the React Native app: cd AgriTrader && npm start")
        print("2. Open ForecastScreen to see real ML predictions")
        print("3. Try switching between crops (Corn/Soybeans/Wheat)")
        print("4. Pull down to refresh predictions")
    else:
        print("Some tests failed. Check the backend logs for errors.")
    
    print("\nAPI Endpoints:")
    print("- Health: http://localhost:5000/api/health")
    print("- Predict: http://localhost:5000/api/predict/<crop>")
    print("- Graph: http://localhost:5000/api/predict/<crop>/graph")

if __name__ == "__main__":
    main()
