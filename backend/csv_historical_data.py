"""
CSV Historical Data Loader
Uses the ACTUAL historical price data from NORMAL_VALS_ml_training_data.csv
This is REAL Pennsylvania grain prices from 2024-2025
"""

import pandas as pd
import os
from datetime import datetime, timedelta

class CSVHistoricalData:
    """
    Loads real historical PA grain prices from CSV
    """
    
    def __init__(self, csv_path=None):
        """Initialize with path to CSV"""
        if csv_path is None:
            # Try multiple possible paths
            current_dir = os.path.dirname(os.path.abspath(__file__))
            possible_paths = [
                os.path.join(current_dir, '..', '..', 'NORMAL_VALS_ml_training_data.csv'),
                os.path.join(current_dir, '..', 'NORMAL_VALS_ml_training_data.csv'),
                'NORMAL_VALS_ml_training_data.csv',
                '../../NORMAL_VALS_ml_training_data.csv'
            ]
            
            # Find the first path that exists
            for path in possible_paths:
                abs_path = os.path.abspath(path)
                if os.path.exists(abs_path):
                    self.csv_path = abs_path
                    break
            else:
                print("Warning: Could not find NORMAL_VALS_ml_training_data.csv")
                self.csv_path = possible_paths[0]  # Use first as fallback
        else:
            self.csv_path = csv_path
        
        self.df = None
        self.load_data()
    
    def load_data(self):
        """Load the CSV data"""
        try:
            self.df = pd.read_csv(self.csv_path)
            # Handle both date formats (with and without time)
            self.df['date'] = pd.to_datetime(self.df['date'], format='mixed', errors='coerce')
            print(f"[OK] Loaded real historical data: {len(self.df)} records")
            print(f"   Date range: {self.df['date'].min()} to {self.df['date'].max()}")
        except Exception as e:
            print(f"[ERROR] Error loading CSV: {e}")
            self.df = None
    
    def get_historical_prices(self, crop, days=30, location='PA'):
        """
        Get historical prices from CSV
        
        Args:
            crop: 'corn', 'soybeans', or 'wheat'
            days: Number of days back
            location: State (currently only PA in dataset)
        
        Returns:
            List of {date, price} dictionaries
        """
        if self.df is None:
            return []
        
        # Map crop to column name
        column_map = {
            'corn': 'alt_corn_cash_price',
            'soybeans': 'alt_soybeans_cash_price',
            'wheat': 'alt_wheat_cash_price'
        }
        
        column = column_map.get(crop.lower())
        if not column:
            return []
        
        # Get data for this crop (drop NaN values)
        crop_data = self.df[['date', column]].dropna()
        
        # Get most recent N days
        end_date = crop_data['date'].max()
        start_date = end_date - timedelta(days=days)
        
        filtered = crop_data[crop_data['date'] >= start_date].copy()
        filtered = filtered.sort_values('date')
        
        # Convert to list of dictionaries
        prices = []
        for _, row in filtered.iterrows():
            prices.append({
                'date': row['date'].strftime('%Y-%m-%d'),
                'price': round(float(row[column]), 2)
            })
        
        return prices
    
    def get_latest_price(self, crop, location='PA'):
        """Get the most recent price from CSV"""
        prices = self.get_historical_prices(crop, days=1, location=location)
        return prices[-1]['price'] if prices else None
    
    def get_recent_prices(self, crop, count=5):
        """Get the last N prices (for chart display)"""
        prices = self.get_historical_prices(crop, days=count + 5)  # Extra buffer
        return [p['price'] for p in prices[-count:]] if prices else []
    
    def get_price_statistics(self, crop, days=30):
        """Calculate statistics for a crop"""
        prices = self.get_historical_prices(crop, days)
        
        if not prices:
            return None
        
        price_values = [p['price'] for p in prices]
        
        return {
            'mean': round(sum(price_values) / len(price_values), 2),
            'min': round(min(price_values), 2),
            'max': round(max(price_values), 2),
            'current': price_values[-1],
            'change': round(price_values[-1] - price_values[0], 2),
            'change_pct': round(((price_values[-1] - price_values[0]) / price_values[0]) * 100, 2)
        }

# Singleton instance
csv_data = CSVHistoricalData()
