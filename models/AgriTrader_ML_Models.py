import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, Lasso
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class AgriTraderMLModels:
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.model_performance = {}
        
        # Crop-specific feature weights based on agricultural knowledge
        self.crop_weights = {
            'corn': {
                'temperature_2m_max': 0.25,
                'precipitation_sum': 0.20,
                'gdd_cumulative': 0.30,  # Growing Degree Days very important for corn
                'drought_index': 0.15,
                'economic_factors': 0.10
            },
            'soybeans': {
                'temperature_2m_max': 0.20,
                'precipitation_sum': 0.25,  # Soybeans are sensitive to moisture
                'gdd_cumulative': 0.25,
                'drought_index': 0.20,
                'economic_factors': 0.10
            },
            'wheat': {
                'temperature_2m_max': 0.30,  # Wheat is very temperature sensitive
                'precipitation_sum': 0.15,
                'gdd_cumulative': 0.20,
                'drought_index': 0.25,  # Drought heavily affects wheat
                'economic_factors': 0.10
            }
        }
    
    def load_and_prepare_data(self, csv_path):
        """Load and prepare the scaled training data"""
        print("Loading training data...")
        self.df = pd.read_csv(csv_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        
        # Separate features and targets
        self.feature_columns = [
            'temperature_2m_max', 'precipitation_sum', 'gdd_cumulative', 'drought_index',
            '10yr_treasury', 'unemployment_rate', 'cpi', 'usd_eur',
            'corn_world_price', 'soy_world_price', 'wheat_world_price'
        ]
        
        self.target_columns = {
            'corn': 'alt_corn_cash_price',
            'soybeans': 'alt_soybeans_cash_price', 
            'wheat': 'alt_wheat_cash_price'
        }
        
        print(f"Loaded {len(self.df)} records from {self.df['date'].min()} to {self.df['date'].max()}")
        print(f"Features: {self.feature_columns}")
        print(f"Targets: {list(self.target_columns.values())}")
        
        return self.df
    
    def create_crop_specific_features(self, crop, X):
        """Create crop-specific weighted features"""
        X_weighted = X.copy()
        
        # Apply crop-specific weights to relevant features
        weights = self.crop_weights[crop]
        
        # Temperature and weather features
        X_weighted['temperature_weighted'] = X['temperature_2m_max'] * weights['temperature_2m_max']
        X_weighted['precipitation_weighted'] = X['precipitation_sum'] * weights['precipitation_sum']
        X_weighted['gdd_weighted'] = X['gdd_cumulative'] * weights['gdd_cumulative']
        X_weighted['drought_weighted'] = X['drought_index'] * weights['drought_index']
        
        # Economic factors (combined)
        economic_features = ['10yr_treasury', 'unemployment_rate', 'cpi', 'usd_eur']
        X_weighted['economic_weighted'] = X[economic_features].mean(axis=1) * weights['economic_factors']
        
        # Crop-specific world price
        world_price_col = f'{crop}_world_price' if crop == 'corn' else f'{crop}_world_price'
        if crop == 'soybeans':
            world_price_col = 'soy_world_price'
        
        if world_price_col in X.columns:
            X_weighted['world_price_weighted'] = X[world_price_col] * 0.5  # Strong influence from world prices
        
        # Add seasonal features — use explicit column when available (inference),
        # fall back to index for bulk training data
        if 'day_of_year' in X.columns:
            X_weighted['day_of_year'] = X['day_of_year']
        else:
            X_weighted['day_of_year'] = X.index % 365
        X_weighted['seasonal_sin'] = np.sin(2 * np.pi * X_weighted['day_of_year'] / 365)
        X_weighted['seasonal_cos'] = np.cos(2 * np.pi * X_weighted['day_of_year'] / 365)
        
        return X_weighted
    
    def train_crop_model(self, crop, use_ensemble=True):
        """Train a specialized model for a specific crop"""
        print(f"\n{'='*50}")
        print(f"Training {crop.upper()} model...")
        
        # Prepare features and target
        X = self.df[self.feature_columns].copy()
        y = self.df[self.target_columns[crop]].copy()
        
        # Remove rows with missing target values
        valid_mask = ~y.isna()
        X = X[valid_mask]
        y = y[valid_mask]
        
        # Remove rows with missing feature values
        feature_mask = ~X.isna().any(axis=1)
        X = X[feature_mask]
        y = y[feature_mask]
        
        if len(X) == 0:
            print(f"No valid data for {crop}")
            return None
        
        # Fill any remaining NaN values with median
        X = X.fillna(X.median())
        
        # Create crop-specific features
        X_enhanced = self.create_crop_specific_features(crop, X)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_enhanced)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        if use_ensemble:
            # Ensemble model with multiple algorithms
            models = {
                'random_forest': RandomForestRegressor(
                    n_estimators=100, 
                    max_depth=10, 
                    random_state=42,
                    min_samples_split=5,
                    min_samples_leaf=2
                ),
                'gradient_boosting': GradientBoostingRegressor(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                ),
                'ridge': Ridge(alpha=1.0, random_state=42)
            }
            
            # Train ensemble and get predictions
            ensemble_predictions = []
            model_scores = {}
            
            for name, model in models.items():
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                score = r2_score(y_test, y_pred)
                model_scores[name] = score
                ensemble_predictions.append(y_pred)
                print(f"  {name}: R² = {score:.4f}")
            
            # Weight ensemble based on performance
            weights = np.array(list(model_scores.values()))
            weights = weights / weights.sum()
            
            # Create weighted ensemble prediction
            final_pred = np.average(ensemble_predictions, axis=0, weights=weights)
            final_score = r2_score(y_test, final_pred)
            
            print(f"  Ensemble: R² = {final_score:.4f}")
            
            # Store the best performing individual model
            best_model_name = max(model_scores.keys(), key=lambda k: model_scores[k])
            best_model = models[best_model_name]
            
        else:
            # Single Random Forest model
            best_model = RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                random_state=42,
                min_samples_split=3,
                min_samples_leaf=1
            )
            best_model.fit(X_train, y_train)
            y_pred = best_model.predict(X_test)
            final_score = r2_score(y_test, y_pred)
            print(f"  Random Forest: R² = {final_score:.4f}")
        
        # Calculate additional metrics
        mae = mean_absolute_error(y_test, final_pred if use_ensemble else y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, final_pred if use_ensemble else y_pred))
        
        # Feature importance
        feature_names = X_enhanced.columns.tolist()
        if hasattr(best_model, 'feature_importances_'):
            importance = best_model.feature_importances_
            feature_importance = dict(zip(feature_names, importance))
            # Sort by importance
            feature_importance = dict(sorted(feature_importance.items(), 
                                           key=lambda x: x[1], reverse=True))
        else:
            feature_importance = {name: 0.1 for name in feature_names}
        
        # Store model and results
        self.models[crop] = best_model
        self.scalers[crop] = scaler
        self.feature_importance[crop] = feature_importance
        self.model_performance[crop] = {
            'r2_score': final_score,
            'mae': mae,
            'rmse': rmse,
            'n_features': len(feature_names),
            'n_samples': len(X)
        }
        
        print(f"  MAE: {mae:.4f}")
        print(f"  RMSE: {rmse:.4f}")
        print(f"  Top features: {list(feature_importance.keys())[:5]}")
        
        return best_model
    
    def train_all_models(self):
        """Train models for all three crops"""
        print("Training all crop models...")
        
        crops = ['corn', 'soybeans', 'wheat']
        
        for crop in crops:
            self.train_crop_model(crop, use_ensemble=True)
        
        # Save models and metadata
        self.save_models()
        self.save_model_metadata()
        
        return self.models
    
    def predict_price(self, crop, features_dict, days_ahead=1):
        """
        Predict price for a specific crop and location
        
        Args:
            crop: 'corn', 'soybeans', or 'wheat'
            features_dict: Dictionary with feature values for prediction
            days_ahead: Number of days to predict ahead (1 = tomorrow, 7 = next week)
        
        Returns:
            Dictionary with prediction results
        """
        if crop not in self.models:
            raise ValueError(f"No trained model for {crop}")
        
        # Prepare features
        feature_values = []
        for col in self.feature_columns:
            if col in features_dict:
                feature_values.append(features_dict[col])
            else:
                # Use default/median values if not provided
                feature_values.append(0.0)
        
        X = pd.DataFrame([feature_values], columns=self.feature_columns)
        X_enhanced = self.create_crop_specific_features(crop, X)
        
        # Scale features
        X_scaled = self.scalers[crop].transform(X_enhanced)
        
        # Make prediction
        prediction = self.models[crop].predict(X_scaled)[0]
        
        # Add confidence interval based on model performance
        rmse = self.model_performance[crop]['rmse']
        confidence_interval = 1.96 * rmse  # 95% confidence interval
        
        result = {
            'crop': crop,
            'predicted_price': float(prediction),
            'confidence_lower': float(prediction - confidence_interval),
            'confidence_upper': float(prediction + confidence_interval),
            'model_confidence': float(self.model_performance[crop]['r2_score']),
            'days_ahead': days_ahead,
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def predict_multiple_days(self, crop, features_dict, days_list=[1, 3, 7, 14, 30, 60, 90, 120, 150, 180]):
        """
        Predict prices for multiple days ahead (for graph display)
        Now supports up to 6 months (180 days) with seasonal adjustments
        
        Args:
            crop: 'corn', 'soybeans', or 'wheat'
            features_dict: Base feature values
            days_list: List of days to predict (e.g., [1, 3, 7, 14, 30, 60, 90, 120, 150, 180])
        
        Returns:
            List of prediction results for each day
        """
        predictions = []
        today = datetime.now()
        
        for days in days_list:
            # Adjust features based on time horizon with seasonal awareness
            adjusted_features = features_dict.copy()
            
            # Calculate the future date
            future_date = today + timedelta(days=days)
            day_of_year = future_date.timetuple().tm_yday
            month = future_date.month
            
            # Add realistic time-based feature adjustments based on historical patterns
            # These adjustments reflect expected changes in market conditions over time
            
            # 1. CROP-SPECIFIC SEASONAL WEATHER PATTERNS
            # Each crop has different growing seasons and sensitivities!
            if crop == 'corn':
                # Corn: summer crop, heat stress in Jul-Aug pollination
                temp_adjustment = np.sin(2 * np.pi * (day_of_year - 200) / 365) * 0.5
                precip_adjustment = -np.sin(2 * np.pi * day_of_year / 365) * 0.4  # Need rain during growing
                gdd_adjustment = np.sin(2 * np.pi * (day_of_year - 105) / 365) * 1.0
                drought_adjustment = np.sin(2 * np.pi * (day_of_year - 200) / 365) * 0.5
            elif crop == 'soybeans':
                # Soybeans: moisture critical in Aug-Sep
                temp_adjustment = np.sin(2 * np.pi * (day_of_year - 230) / 365) * 0.6
                precip_adjustment = np.sin(2 * np.pi * (day_of_year - 250) / 365) * 0.7  # CRITICAL in Aug
                gdd_adjustment = np.sin(2 * np.pi * (day_of_year - 105) / 365) * 0.8
                drought_adjustment = -np.sin(2 * np.pi * (day_of_year - 230) / 365) * 0.6
            else:  # wheat
                # Wheat: winter crop, planted fall, needs spring moisture
                temp_adjustment = -np.sin(2 * np.pi * day_of_year / 365) * 0.5  # Cool weather good
                precip_adjustment = np.sin(2 * np.pi * (day_of_year - 90) / 365) * 0.6  # Spring rain critical
                gdd_adjustment = -np.sin(2 * np.pi * (day_of_year - 180) / 365) * 0.5
                drought_adjustment = np.sin(2 * np.pi * (day_of_year - 90) / 365) * 0.6
            
            adjusted_features['temperature_2m_max'] = adjusted_features.get('temperature_2m_max', 0) + temp_adjustment
            adjusted_features['precipitation_sum'] = adjusted_features.get('precipitation_sum', 0) + precip_adjustment
            adjusted_features['gdd_cumulative'] = adjusted_features.get('gdd_cumulative', 0) + gdd_adjustment
            adjusted_features['drought_index'] = adjusted_features.get('drought_index', 0) + drought_adjustment
            
            # 2. WORLD PRICE TRENDS (based on commodity-specific seasonal patterns)
            # Historical patterns show different seasonal trends for different crops
            months_from_now = days / 30.0
            if crop == 'corn':
                # Corn: historically lower in fall (harvest), higher in late winter/spring (planting expectations)
                trend_factor = 0.5 + 0.35 * np.sin(2 * np.pi * (month - 9) / 12)  # Harvest time = month 9-10
                price_change = (trend_factor - 0.5) * months_from_now * 0.06  # 6% per month potential change
                adjusted_features['corn_world_price'] = adjusted_features.get('corn_world_price', 0) + price_change
            elif crop == 'soybeans':
                # Soybeans: lower in fall harvest, rising in winter/spring
                trend_factor = 0.5 + 0.3 * np.sin(2 * np.pi * (month - 9) / 12)
                price_change = (trend_factor - 0.5) * months_from_now * 0.05
                adjusted_features['soy_world_price'] = adjusted_features.get('soy_world_price', 0) + price_change
            else:  # wheat
                # Wheat: planted in fall, harvested in summer
                trend_factor = 0.5 + 0.3 * np.sin(2 * np.pi * (month - 7) / 12)  # Harvest in summer
                price_change = (trend_factor - 0.5) * months_from_now * 0.05
                adjusted_features['wheat_world_price'] = adjusted_features.get('wheat_world_price', 0) + price_change
            
            # 3. ECONOMIC INDICATORS (gradual drift; deterministic so graph curves are stable per horizon)
            economic_drift = months_from_now * 0.015 + 0.01 * np.sin(2 * np.pi * days / 120.0)
            adjusted_features['10yr_treasury'] = adjusted_features.get('10yr_treasury', 0) + economic_drift * 0.8
            adjusted_features['cpi'] = adjusted_features.get('cpi', 0) + economic_drift * 1.0
            
            prediction = self.predict_price(crop, adjusted_features, days)
            
            # Only widen confidence intervals for longer horizons (realistic uncertainty)
            rmse = self.model_performance[crop].get('rmse', 0.5)
            additional_uncertainty = 0.01 * np.sqrt(days / 30)  # Slight increase in uncertainty over time
            prediction['confidence_lower'] -= additional_uncertainty * rmse
            prediction['confidence_upper'] += additional_uncertainty * rmse
            
            # Add date information for UI (create a new dict with additional fields)
            prediction_with_date = prediction.copy()
            prediction_with_date['date'] = future_date.strftime('%Y-%m-%d')
            prediction_with_date['day_of_year'] = day_of_year
            prediction_with_date['month_name'] = future_date.strftime('%b')  # Jan, Feb, etc.
            
            predictions.append(prediction_with_date)
        
        return predictions
    
    def save_models(self):
        """Save trained models to files"""
        print("\nSaving models...")
        
        for crop, model in self.models.items():
            filename = f"agritrader_{crop}_model.pkl"
            joblib.dump(model, filename)
            print(f"  Saved {crop} model to {filename}")
        
        for crop, scaler in self.scalers.items():
            filename = f"agritrader_{crop}_scaler.pkl"
            joblib.dump(scaler, filename)
            print(f"  Saved {crop} scaler to {filename}")
    
    def save_model_metadata(self):
        """Save model metadata and performance metrics"""
        metadata = {
            'model_performance': self.model_performance,
            'feature_importance': self.feature_importance,
            'crop_weights': self.crop_weights,
            'feature_columns': self.feature_columns,
            'target_columns': self.target_columns,
            'training_date': datetime.now().isoformat(),
            'data_range': {
                'start': str(self.df['date'].min()),
                'end': str(self.df['date'].max()),
                'n_records': len(self.df)
            }
        }
        
        with open('agritrader_model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("  Saved model metadata to agritrader_model_metadata.json")
    
    def load_models(self):
        """Load pre-trained models"""
        print("Loading pre-trained models...")
        
        crops = ['corn', 'soybeans', 'wheat']
        
        for crop in crops:
            try:
                model_file = f"agritrader_{crop}_model.pkl"
                scaler_file = f"agritrader_{crop}_scaler.pkl"
                
                self.models[crop] = joblib.load(model_file)
                self.scalers[crop] = joblib.load(scaler_file)
                print(f"  Loaded {crop} model")
            except FileNotFoundError:
                print(f"  Warning: {crop} model not found. Run training first.")
        
        # Load metadata
        try:
            with open('agritrader_model_metadata.json', 'r') as f:
                metadata = json.load(f)
                self.model_performance = metadata.get('model_performance', {})
                self.feature_importance = metadata.get('feature_importance', {})
                self.crop_weights = metadata.get('crop_weights', {})
            print("  Loaded model metadata")
        except FileNotFoundError:
            print("  Warning: Model metadata not found")

# Example usage and testing
def test_models():
    """Test the trained models with sample data"""
    print("\n" + "="*60)
    print("TESTING AGRI TRADER ML MODELS")
    print("="*60)
    
    # Initialize and train models
    ml_models = AgriTraderMLModels()
    ml_models.load_and_prepare_data('SCALED_ml_training_dataset.csv')
    ml_models.train_all_models()
    
    # Test predictions
    print("\n" + "="*40)
    print("TESTING PREDICTIONS")
    print("="*40)
    
    # Sample feature data (scaled values)
    sample_features = {
        'temperature_2m_max': 0.5,      # Slightly above average temperature
        'precipitation_sum': -0.3,      # Below average precipitation  
        'gdd_cumulative': 1.2,          # High growing degree days
        'drought_index': -0.5,          # Good moisture conditions
        '10yr_treasury': 0.2,           # Slightly higher interest rates
        'unemployment_rate': -0.1,      # Low unemployment
        'cpi': 0.3,                     # Moderate inflation
        'usd_eur': -0.2,                # Stronger USD
        'corn_world_price': 0.1,        # Slightly above average world price
        'soy_world_price': 0.2,         # Above average soybean world price
        'wheat_world_price': -0.1       # Below average wheat world price
    }
    
    crops = ['corn', 'soybeans', 'wheat']
    
    for crop in crops:
        print(f"\n{crop.upper()} PREDICTIONS:")
        print("-" * 30)
        
        # Single day prediction
        prediction = ml_models.predict_price(crop, sample_features, days_ahead=1)
        print(f"Tomorrow: ${prediction['predicted_price']:.2f}")
        print(f"Confidence: {prediction['confidence_lower']:.2f} - {prediction['confidence_upper']:.2f}")
        print(f"Model R²: {prediction['model_confidence']:.3f}")
        
        # Multiple day predictions (for graph)
        multi_predictions = ml_models.predict_multiple_days(
            crop, sample_features, days_list=[1, 3, 7, 14]
        )
        
        print("\nMulti-day predictions (for app graph):")
        for pred in multi_predictions:
            print(f"  {pred['days_ahead']} days: ${pred['predicted_price']:.2f}")

if __name__ == "__main__":
    test_models()
