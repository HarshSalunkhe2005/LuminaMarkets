import feedparser
import urllib.parse

def get_recent_news_for_stock(symbol: str) -> list[str]:
    """
    Fetches the latest news headlines and snippets for a given stock symbol.
    We use Google News RSS as a reliable aggregator.
    """
    query = urllib.parse.quote(f"{symbol} stock India")
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    
    feed = feedparser.parse(url)
    
    snippets = []
    for entry in feed.entries[:5]:  # Get top 5 recent articles
        # Clean up HTML tags if any
        title = entry.title
        # Sometimes description is useful, sometimes it's noisy. We'll stick to titles for fast sentiment.
        snippets.append(title)
        
    return snippets
