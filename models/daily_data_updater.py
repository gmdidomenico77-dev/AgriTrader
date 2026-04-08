"""
Daily Data Updater for AgriTrader
Fetches latest grain prices and updates the training CSV
Run this daily via cron job or Task Scheduler
"""

import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import os

class DailyDataUpdater:
    def __init__(self, csv_path='NORMAL_VALS_ml_training_data.csv'):
        self.csv_path = csv_path
        self.futures_symbols = {
            'corn': 'ZC=F',      # Corn futures
            'soybeans': 'ZS=F',  # Soybean futures
            'wheat': 'ZW=F'      # Wheat futures
        }
        
        # PA basis adjustments (vs CBOT)
        self.pa_basis = {
            'corn': -0.15,      # PA corn typically $0.15 below CBOT
            'soybeans': -0.25,  # PA soybeans typically $0.25 below CBOT
            'wheat': -0.20      # PA wheat typically $0.20 below CBOT
        }
    
    def load_existing_data(self):
        """Load existing CSV data"""
        try:
            df = pd.read_csv(self.csv_path)
            df['date'] = pd.to_datetime(df['date'], format='mixed')
            print(f"[OK] Loaded existing data: {len(df)} records")
            print(f"    Date range: {df['date'].min()} to {df['date'].max()}")
            return df
        except FileNotFoundError:
            print("[ERROR] CSV file not found!")
            return None
    
    def fetch_latest_prices(self):
        """Fetch latest prices from Yahoo Finance"""
        try:
            prices = {}
            today = datetime.now().strftime('%Y-%m-%d')
            
            for crop, symbol in self.futures_symbols.items():
                print(f"  Fetching {crop} ({symbol})...")
                ticker = yf.Ticker(symbol)
                
                # Get last 2 days to ensure we have data
                hist = ticker.history(period='2d')
                
                if len(hist) > 0:
                    # Get most recent close price
                    latest_price = hist['Close'].iloc[-1]
                    
                    # Convert cents/bushel to dollars/bushel
                    if crop in ['corn', 'wheat']:
                        latest_price = latest_price / 100
                    elif crop == 'soybeans':
                        latest_price = latest_price / 100
                    
                    # Apply PA basis adjustment
                    pa_price = latest_price + self.pa_basis[crop]
                    
                    prices[crop] = round(pa_price, 2)
                    print(f"    {crop}: ${pa_price:.2f}/bu")
                else:
                    print(f"    [WARNING] No data for {crop}")
                    prices[crop] = None
            
            return prices, today
        except Exception as e:
            print(f"[ERROR] Failed to fetch prices: {e}")
            return None, None
    
    def update_csv(self, new_prices, date):
        """Add new row to CSV"""
        df = self.load_existing_data()
        
        if df is None:
            print("[ERROR] Cannot update without existing data")
            return False
        
        # Check if date already exists
        if date in df['date'].astype(str).values:
            print(f"[INFO] Data for {date} already exists, skipping...")
            return True
        
        # Create new row
        new_row = {
            'date': date,
            'alt_corn_cash_price': new_prices['corn'],
            'alt_soybeans_cash_price': new_prices['soybeans'],
            'alt_wheat_cash_price': new_prices['wheat']
        }
        
        # Append to dataframe
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        
        # Save back to CSV
        df.to_csv(self.csv_path, index=False)
        print(f"[OK] Updated CSV with {date} data")
        print(f"    Total records: {len(df)}")
        
        return True
    
    def run_daily_update(self):
        """Main method to run daily update"""
        print("="*60)
        print("AgriTrader Daily Data Update")
        print(f"Timestamp: {datetime.now()}")
        print("="*60)
        
        # Fetch latest prices
        print("\n[1] Fetching latest prices...")
        prices, date = self.fetch_latest_prices()
        
        if prices is None:
            print("[ERROR] Failed to fetch prices, aborting...")
            return False
        
        # Check if all prices are available
        missing = [crop for crop, price in prices.items() if price is None]
        if missing:
            print(f"[WARNING] Missing prices for: {', '.join(missing)}")
            print("Update aborted - incomplete data")
            return False
        
        # Update CSV
        print("\n[2] Updating CSV...")
        success = self.update_csv(prices, date)
        
        if success:
            print("\n[SUCCESS] Daily update complete!")
            print(f"New prices added for {date}:")
            print(f"  Corn:     ${prices['corn']:.2f}/bu")
            print(f"  Soybeans: ${prices['soybeans']:.2f}/bu")
            print(f"  Wheat:    ${prices['wheat']:.2f}/bu")
            return True
        else:
            print("\n[ERROR] Update failed")
            return False

if __name__ == "__main__":
    updater = DailyDataUpdater()
    updater.run_daily_update()
