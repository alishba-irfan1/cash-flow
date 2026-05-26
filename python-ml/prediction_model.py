# ============================================
# EXPENSE PREDICTION MODEL
# Uses Linear Regression to predict future spending
# Beginner-friendly ML implementation
# ============================================

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from datetime import datetime, timedelta

class ExpensePredictor:
    """
    A simple machine learning model to predict expenses.
    Uses Linear Regression - perfect for beginners!
    """
    
    def __init__(self):
        self.model = LinearRegression()
        self.label_encoder = LabelEncoder()
        self.is_trained = False
    
    def prepare_data(self, transactions):
        """
        Prepare transaction data for ML model.
        Converts dates to numbers and categories to labels.
        """
        if not transactions:
            return None, None
        
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Keep only expenses
        df = df[df['type'] == 'expense'].copy()
        
        if df.empty:
            return None, None
        
        # Convert date string to datetime
        df['date_parsed'] = pd.to_datetime(df['transaction_date'])
        
        # Create numeric features
        # Day of month (1-31)
        df['day_of_month'] = df['date_parsed'].dt.day
        
        # Day of week (0-6, Monday=0)
        df['day_of_week'] = df['date_parsed'].dt.dayofweek
        
        # Days since first transaction
        min_date = df['date_parsed'].min()
        df['days_since_start'] = (df['date_parsed'] - min_date).dt.days
        
        # Encode category name to numbers
        df['category_encoded'] = self.label_encoder.fit_transform(df['category_name'])
        
        # Features (X) and Target (y)
        X = df[['day_of_month', 'day_of_week', 'days_since_start', 'category_encoded']]
        y = df['amount']
        
        return X, y
    
    def train(self, transactions):
        """
        Train the model on historical transaction data.
        """
        X, y = self.prepare_data(transactions)
        
        if X is None or len(X) < 5:
            print("Not enough data to train model")
            return False
        
        try:
            self.model.fit(X, y)
            self.is_trained = True
            return True
        except Exception as e:
            print(f"Training failed: {e}")
            return False
    
    def predict_next_week(self, transactions):
        """
        Predict total expenses for next 7 days.
        """
        if not self.is_trained:
            return 0, 'low'
        
        # Get last date from transactions
        df = pd.DataFrame(transactions)
        df['date_parsed'] = pd.to_datetime(df['transaction_date'])
        last_date = df['date_parsed'].max()
        
        # Get unique categories
        categories = df['category_name'].unique()
        
        total_prediction = 0
        
        # Predict for each day and category
        for day_offset in range(1, 8):  # Next 7 days
            future_date = last_date + timedelta(days=day_offset)
            min_date = df['date_parsed'].min()
            
            for category in categories:
                try:
                    # Prepare features for prediction
                    category_encoded = self.label_encoder.transform([category])[0]
                    features = np.array([[
                        future_date.day,
                        future_date.weekday(),
                        (future_date - min_date).days,
                        category_encoded
                    ]])
                    
                    # Make prediction (ensure non-negative)
                    prediction = max(0, self.model.predict(features)[0])
                    total_prediction += prediction
                except:
                    continue
        
        # Determine confidence based on data size
        data_size = len(df[df['type'] == 'expense'])
        if data_size >= 30:
            confidence = 'high'
        elif data_size >= 15:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        return round(total_prediction, 2), confidence
    
    def predict_next_month(self, transactions):
        """
        Predict total expenses for next 30 days.
        """
        if not self.is_trained:
            return 0, 'low'
        
        # Similar to weekly prediction but for 30 days
        df = pd.DataFrame(transactions)
        df['date_parsed'] = pd.to_datetime(df['transaction_date'])
        last_date = df['date_parsed'].max()
        
        categories = df['category_name'].unique()
        total_prediction = 0
        
        for day_offset in range(1, 31):  # Next 30 days
            future_date = last_date + timedelta(days=day_offset)
            min_date = df['date_parsed'].min()
            
            for category in categories:
                try:
                    category_encoded = self.label_encoder.transform([category])[0]
                    features = np.array([[
                        future_date.day,
                        future_date.weekday(),
                        (future_date - min_date).days,
                        category_encoded
                    ]])
                    
                    prediction = max(0, self.model.predict(features)[0])
                    total_prediction += prediction
                except:
                    continue
        
        data_size = len(df[df['type'] == 'expense'])
        if data_size >= 60:
            confidence = 'high'
        elif data_size >= 30:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        return round(total_prediction, 2), confidence
    
    def get_trend(self, transactions):
        """
        Analyze if spending is increasing or decreasing.
        """
        if not transactions:
            return 'stable'
        
        df = pd.DataFrame(transactions)
        df = df[df['type'] == 'expense'].copy()
        df['date_parsed'] = pd.to_datetime(df['transaction_date'])
        
        if len(df) < 7:
            return 'stable'
        
        # Group by week and calculate totals
        df['week'] = df['date_parsed'].dt.isocalendar().week
        weekly_totals = df.groupby('week')['amount'].sum()
        
        if len(weekly_totals) < 2:
            return 'stable'
        
        # Compare last two weeks
        recent = weekly_totals.iloc[-1]
        previous = weekly_totals.iloc[-2]
        
        change = (recent - previous) / max(previous, 1) * 100
        
        if change > 15:
            return 'increasing'
        elif change < -15:
            return 'decreasing'
        else:
            return 'stable'


# ============================================
# SPENDING ANALYZER
# Analyzes spending patterns without prediction
# ============================================

class SpendingAnalyzer:
    """Analyzes spending patterns and generates insights."""
    
    def __init__(self, transactions):
        self.df = pd.DataFrame(transactions)
        self.expenses = self.df[self.df['type'] == 'expense'].copy()
        self.expenses['date_parsed'] = pd.to_datetime(self.expenses['transaction_date'])
    
    def get_category_percentages(self):
        """Get percentage breakdown by category."""
        if self.expenses.empty:
            return {}
        
        category_totals = self.expenses.groupby('category_name')['amount'].sum()
        total = category_totals.sum()
        
        percentages = {}
        for category, amount in category_totals.items():
            percentages[category] = round((amount / total) * 100, 1)
        
        return percentages
    
    def get_spending_by_day_of_week(self):
        """Find which days have highest spending."""
        if self.expenses.empty:
            return {}
        
        self.expenses['day_name'] = self.expenses['date_parsed'].dt.day_name()
        day_totals = self.expenses.groupby('day_name')['amount'].sum()
        
        # Sort by day order
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_totals = day_totals.reindex(day_order)
        
        return day_totals.to_dict()
    
    def detect_anomalies(self, threshold_percentile=90):
        """Detect unusually high expenses."""
        if self.expenses.empty:
            return []
        
        threshold = self.expenses['amount'].quantile(threshold_percentile / 100)
        anomalies = self.expenses[self.expenses['amount'] > threshold]
        
        return anomalies.to_dict('records')