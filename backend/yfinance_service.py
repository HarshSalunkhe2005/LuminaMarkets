import yfinance as yf
import pandas as pd

def get_stock_features(symbol: str):
    """
    Fetches the last month of data and calculates basic features:
    - 5-day Moving Average (normalized)
    - Volatility (Standard deviation of last 5 days)
    - Daily Return (Percentage change of the last close)
    """
    # yfinance often needs .NS for Indian stocks
    query_symbol = symbol if symbol.endswith('.NS') or symbol.endswith('.BO') else f"{symbol}.NS"
    
    ticker = yf.Ticker(query_symbol)
    df = ticker.history(period="1mo")
    
    if df.empty:
        raise ValueError(f"No data found for {query_symbol}")
    
    # Calculate Features
    df['Daily_Return'] = df['Close'].pct_change() * 100
    df['MA_5'] = df['Close'].rolling(window=5).mean()
    df['Volatility_5'] = df['Daily_Return'].rolling(window=5).std()
    
    # Drop NaN values resulting from rolling window
    df = df.dropna()
    
    latest = df.iloc[-1]
    
    # We want normalized MA_5 (distance from current close)
    ma_diff_pct = ((latest['Close'] - latest['MA_5']) / latest['MA_5']) * 100
    
    try:
        prev_close = ticker.fast_info.previous_close
        open_price = ticker.fast_info.open
    except:
        prev_close = None
        open_price = None
        
    return {
        "current_price": latest['Close'],
        "daily_return": latest['Daily_Return'],
        "ma_diff_pct": ma_diff_pct,
        "volatility": latest['Volatility_5'],
        "previous_close": prev_close,
        "open_price": open_price
    }

def get_historical_data_for_chart(symbol: str, period="1mo", interval="1d"):
    """Fetches historical close prices based on period and interval"""
    query_symbol = symbol if symbol.endswith('.NS') or symbol.endswith('.BO') else f"{symbol}.NS"
    ticker = yf.Ticker(query_symbol)
    df = ticker.history(period=period, interval=interval)
    
    if df.empty:
        return []
        
    data = []
    for date, row in df.iterrows():
        # Format the date string based on the interval
        if period == '5d':
            date_str = date.strftime('%b %d %H:%M')
        elif interval in ['1m', '5m', '15m', '30m', '1h']:
            date_str = date.strftime('%H:%M')
        elif period in ['1y', 'ytd']:
            date_str = date.strftime('%b %Y')
        else:
            date_str = date.strftime('%b %d')
            
        data.append({
            "date": date_str,
            "historical": round(row['Close'], 2)
        })
        
    return data
