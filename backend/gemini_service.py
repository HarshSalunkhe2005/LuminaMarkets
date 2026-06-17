import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# We expect GEMINI_API_KEY to be in backend/.env
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def analyze_sentiment(symbol: str, news_snippets: list[str]) -> float:
    """
    Given a list of news snippets for a stock, returns a sentiment score between -1.0 and 1.0.
    1.0 = Highly Bullish
    0.0 = Neutral
    -1.0 = Highly Bearish
    """
    if not api_key:
        print("Warning: GEMINI_API_KEY not set. Returning neutral sentiment.")
        return 0.0
        
    if not news_snippets:
        return 0.0

    combined_news = "\n- ".join(news_snippets)
    prompt = f"""
    You are an expert financial analyst. Analyze the following recent news snippets for the stock '{symbol}'.
    Determine the overall market sentiment for the short term (next few days).
    
    News:
    - {combined_news}
    
    Output ONLY a single floating point number between -1.0 and 1.0 representing the sentiment score.
    -1.0 means highly negative/bearish.
    0.0 means neutral.
    1.0 means highly positive/bullish.
    Do not output any text other than the number.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        score_text = response.text.strip()
        score = float(score_text)
        return max(-1.0, min(1.0, score)) # Clamp between -1 and 1
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return 0.0

def generate_reasoning(symbol: str, sentiment_score: float, features: dict, prediction_trend: str) -> str:
    """
    Generates a human-readable AI Reasoning block explaining the prediction.
    """
    if not api_key:
        return f"Model predicts a {prediction_trend} trend based on technical indicators and sentiment."

    prompt = f"""
    You are the AI Reasoning Engine for a stock prediction app.
    We just ran an online learning ML model for '{symbol}'.
    
    Data:
    - Prediction: {prediction_trend.upper()}
    - News Sentiment Score: {sentiment_score} (-1 to 1)
    - 5-Day Moving Average Diff: {features.get('ma_diff_pct', 0):.2f}%
    - Daily Return: {features.get('daily_return', 0):.2f}%
    - Volatility: {features.get('volatility', 0):.2f}
    
    Write a short, professional, 2-3 sentence paragraph explaining to a retail investor *why* the model predicts a {prediction_trend} trend. 
    Make it sound like an expert AI engine summarizing the data. Do not use asterisks or markdown formatting. Keep it concise.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating reasoning: {e}")
        return f"Model predicts a {prediction_trend} trend based on recent data."
