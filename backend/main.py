from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

from yfinance_service import get_stock_features, get_historical_data_for_chart
from scraper import get_recent_news_for_stock
from gemini_service import analyze_sentiment, generate_reasoning
from ml_model import predictor

app = FastAPI(title="LuminaMarkets AI Backend")

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    symbol: str
    period: str = "1mo"
    interval: str = "1d"

@app.post("/predict")
async def predict_stock(request: PredictRequest):
    symbol = request.symbol.upper()
    try:
        # 1. Fetch Historical Features
        features = get_stock_features(symbol)
        
        # 2. Fetch Recent News & Calculate Sentiment
        news_snippets = get_recent_news_for_stock(symbol)
        sentiment_score = analyze_sentiment(symbol, news_snippets)
        features['sentiment_score'] = sentiment_score
        
        # 3. Simulate continuous training (Online Learning step)
        target = features['daily_return'] + (sentiment_score * 0.5)
        predictor.partial_fit(features, target)
        
        # 4. Predict
        prediction = predictor.predict(features)
        
        # 5. Generate Reasoning using Gemini
        reasoning = generate_reasoning(symbol, sentiment_score, features, prediction['trend'])
        
        # 6. Fetch chart data for the UI
        chart_data = get_historical_data_for_chart(symbol, period=request.period, interval=request.interval)
        
        return {
            "symbol": symbol,
            "prediction": prediction,
            "reasoning": reasoning,
            "features": features,
            "chart_data": chart_data
        }

        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
