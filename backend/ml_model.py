import numpy as np
from sklearn.linear_model import SGDRegressor
from sklearn.preprocessing import StandardScaler
import os
import pickle

MODEL_FILE = "stock_model.pkl"

class OnlineStockPredictor:
    def __init__(self):
        self.model = SGDRegressor(learning_rate='adaptive', eta0=0.01)
        self.scaler = StandardScaler()
        self.is_initialized = False
        
        # Try to load existing state
        if os.path.exists(MODEL_FILE):
            try:
                with open(MODEL_FILE, 'rb') as f:
                    state = pickle.load(f)
                    self.model = state['model']
                    self.scaler = state['scaler']
                    self.is_initialized = True
            except Exception as e:
                print(f"Could not load model: {e}")

    def save_state(self):
        with open(MODEL_FILE, 'wb') as f:
            pickle.dump({'model': self.model, 'scaler': self.scaler}, f)

    def partial_fit(self, features: dict, target_return: float):
        """
        Incrementally train the model with new data.
        Features expected: ma_diff_pct, volatility, daily_return, sentiment_score
        """
        X = np.array([[
            features.get('ma_diff_pct', 0),
            features.get('volatility', 0),
            features.get('daily_return', 0),
            features.get('sentiment_score', 0)
        ]])
        y = np.array([target_return])

        if not self.is_initialized:
            # First time, use fit to initialize weights and scaler
            self.scaler.partial_fit(X)
            X_scaled = self.scaler.transform(X)
            self.model.fit(X_scaled, y)
            self.is_initialized = True
        else:
            self.scaler.partial_fit(X)
            X_scaled = self.scaler.transform(X)
            self.model.partial_fit(X_scaled, y)
            
        self.save_state()

    def predict(self, features: dict):
        """
        Predicts the expected return and categorizes it as Bullish/Neutral/Bearish.
        """
        if not self.is_initialized:
            # If completely untrained, guess based purely on sentiment + daily return
            sentiment = features.get('sentiment_score', 0)
            daily = features.get('daily_return', 0)
            score = (sentiment * 2) + (daily * 0.5)
        else:
            X = np.array([[
                features.get('ma_diff_pct', 0),
                features.get('volatility', 0),
                features.get('daily_return', 0),
                features.get('sentiment_score', 0)
            ]])
            X_scaled = self.scaler.transform(X)
            score = self.model.predict(X_scaled)[0]

        # Thresholds for trends
        if score > 0.5:
            trend = "Bullish"
            confidence = min(99, int(50 + (score * 10)))
        elif score < -0.5:
            trend = "Bearish"
            confidence = min(99, int(50 + (abs(score) * 10)))
        else:
            trend = "Neutral"
            confidence = 50 + int(abs(score) * 20)

        return {
            "trend": trend,
            "score": float(score),
            "confidence": confidence
        }

# Global singleton
predictor = OnlineStockPredictor()
