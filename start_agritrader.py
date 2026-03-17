#!/usr/bin/env python3
"""
AgriTrader Startup Script
Starts both the Flask backend and provides instructions for the React Native frontend
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def start_backend():
    """Start the Flask backend server"""
    print("🚀 Starting AgriTrader ML Backend...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    
    # Start Flask app
    try:
        subprocess.Popen([
            sys.executable, "app.py"
        ], cwd=backend_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("✅ Backend server started on http://localhost:5000")
        return True
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def main():
    print("🌾 AgriTrader - ML-Powered Agricultural Trading Platform")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("AgriTrader").exists():
        print("❌ Please run this script from the ML_PROJ directory")
        return
    
    # Start backend
    if start_backend():
        print("\n📱 Frontend Instructions:")
        print("1. Open a new terminal")
        print("2. cd into AgriTrader directory")
        print("3. Run: npm start")
        print("4. Press 'w' for web or scan QR code for mobile")
        
        print("\n🔗 API Endpoints:")
        print("- Health Check: http://localhost:5000/api/health")
        print("- Predict Price: http://localhost:5000/api/predict/<crop>")
        print("- Graph Data: http://localhost:5000/api/predict/<crop>/graph")
        
        print("\n🌾 Available Crops: corn, soybeans, wheat")
        print("📍 Default Location: PA (Pennsylvania)")
        
        print("\n💡 The app will now use real ML predictions!")
        print("   Pull down to refresh predictions in the app")
        
        # Keep script running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Shutting down AgriTrader...")
    else:
        print("❌ Failed to start AgriTrader")

if __name__ == "__main__":
    main()
