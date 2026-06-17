import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

const RSS_SOURCES = {
  top: [
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'ET Markets' },
    { url: 'https://www.moneycontrol.com/rss/MCtopnews.xml', source: 'Moneycontrol' },
    { url: 'https://www.livemint.com/rss/markets', source: 'Mint' }
  ],
  stocks: [
    { url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', source: 'ET Markets' },
    { url: 'https://www.moneycontrol.com/rss/buzzingstocks.xml', source: 'Moneycontrol' }
  ],
  global: [
    { url: 'https://economictimes.indiatimes.com/markets/global-markets/rssfeeds/11993050.cms', source: 'ET Markets' }
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'top'; 

  try {
    let allNews = [];

    if (category === 'stocks') {
      // 1. Fetch user's watchlist
      const { createClient } = await import('@supabase/supabase-js');
      // We need to initialize a fresh client here since we are in a server route
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: watchlist } = await supabase.from('watchlist').select('symbol, name');
      
      if (!watchlist || watchlist.length === 0) {
        return NextResponse.json({ news: [] }); // Empty watchlist = empty news
      }

      // 2. Fetch Google News for each stock
      await Promise.all(watchlist.map(async (stock) => {
        try {
          const query = encodeURIComponent(`${stock.symbol.replace('.NS', '')} stock India`);
          const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`);
          
          const mappedItems = feed.items.slice(0, 3).map((item, index) => {
            // Google news descriptions are often messy HTML. We will clean them or fallback.
            let cleanSummary = item.contentSnippet || '';
            if (cleanSummary.length < 10) cleanSummary = 'Full details available in the source article.';

            return {
              id: `portfolio-${stock.symbol}-${index}`,
              title: item.title || 'No Title',
              source: item.source || 'Google News',
              time: item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Recent',
              timestamp: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
              category: 'My Portfolio',
              summary: cleanSummary,
              link: item.link,
              sentiment: 'Neutral', 
            };
          });
          allNews.push(...mappedItems);
        } catch (err) {
          console.error(`Failed to fetch news for ${stock.symbol}`, err);
        }
      }));
    } else {
      // General Market News (Top / Global)
      let feeds = category === 'global' ? RSS_SOURCES.global : RSS_SOURCES.top;
      
      await Promise.all(feeds.map(async (feedInfo) => {
        try {
          const feed = await parser.parseURL(feedInfo.url);
          const mappedItems = feed.items.map((item, index) => {
            let cleanSummary = item.contentSnippet || item.content || '';
            if (cleanSummary.length < 10) cleanSummary = 'Full details available in the source article.';
            
            return {
              id: `${feedInfo.source.replace(/\s+/g, '')}-${category}-${index}`,
              title: item.title || 'No Title',
              source: feedInfo.source,
              time: item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Recent',
              timestamp: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
              category: category === 'top' ? 'Top Market News' : 'Global Impact',
              summary: cleanSummary,
              link: item.link,
              sentiment: 'Neutral', 
            };
          });
          allNews.push(...mappedItems);
        } catch (err) {
          console.error(`Failed to fetch from ${feedInfo.source}`, err);
        }
      }));
    }

    // Sort by timestamp descending
    allNews.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ news: allNews.slice(0, 20) });
  } catch (error) {
    console.error('Error fetching RSS:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
