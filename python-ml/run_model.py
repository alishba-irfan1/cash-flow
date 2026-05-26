# ============================================
# ML MODEL RUNNER
# This script is called by PHP to get predictions
# Usage: python run_model.py <path_to_json_file>
# ============================================

import sys
import json
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from prediction_model import ExpensePredictor, SpendingAnalyzer
    import_success = True
except ImportError as e:
    import_success = False
    print(json.dumps({
        'success': False,
        'error': f'Missing dependencies: {e}. Run: pip install -r requirements.txt'
    }))
    sys.exit(0)


def main():
    """
    Main function that processes transaction data
    and returns ML predictions.
    """
    
    # Check if JSON file path is provided
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No data file provided'
        }))
        return
    
    json_file = sys.argv[1]
    
    # Read the transaction data
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'Failed to read data file: {e}'
        }))
        return
    
    transactions = data.get('transactions', [])
    
    if not transactions:
        print(json.dumps({
            'success': True,
            'data': {
                'next_week': 0,
                'next_month': 0,
                'daily_average': 0,
                'trend': 'stable',
                'confidence': 'low',
                'source': 'no_data'
            }
        }))
        return
    
    # Initialize predictor
    predictor = ExpensePredictor()
    
    # Train the model
    trained = predictor.train(transactions)
    
    if trained:
        # Get predictions
        next_week, week_confidence = predictor.predict_next_week(transactions)
        next_month, month_confidence = predictor.predict_next_month(transactions)
        trend = predictor.get_trend(transactions)
        
        # Calculate daily average
        expenses = [t for t in transactions if t['type'] == 'expense']
        if expenses:
            total_expense = sum(t['amount'] for t in expenses)
            daily_average = total_expense / 30  # Assume 30 day period
        else:
            daily_average = 0
        
        # Use the lower confidence of the two
        confidence = week_confidence if week_confidence == month_confidence else week_confidence
        
        result = {
            'next_week': next_week,
            'next_month': next_month,
            'daily_average': round(daily_average, 2),
            'trend': trend,
            'confidence': confidence,
            'source': 'ml_model'
        }
    else:
        # If training failed, return zeros
        result = {
            'next_week': 0,
            'next_month': 0,
            'daily_average': 0,
            'trend': 'stable',
            'confidence': 'low',
            'source': 'insufficient_data'
        }
    
    # Optional: Add spending analysis
    try:
        analyzer = SpendingAnalyzer(transactions)
        result['category_percentages'] = analyzer.get_category_percentages()
        result['day_pattern'] = analyzer.get_spending_by_day_of_week()
    except:
        pass
    
    # Output result as JSON
    print(json.dumps({
        'success': True,
        'data': result
    }))


if __name__ == '__main__':
    main()