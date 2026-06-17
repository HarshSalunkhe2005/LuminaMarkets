import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Attempt to extract the main article text
    // We target common article wrappers or just fallback to paragraphs
    let paragraphs: string[] = [];
    
    $('article p, .article-content p, .story-content p, .paywall p').each((_, el) => {
      paragraphs.push($(el).text().trim());
    });
    
    // If specific selectors fail, just grab all meaningful paragraphs
    if (paragraphs.length === 0) {
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) paragraphs.push(text); // Filter out short UI text
      });
    }

    const content = paragraphs.join('\n\n');

    return NextResponse.json({ content: content || 'Could not extract full article text. Please visit the original source.' });
  } catch (error) {
    console.error('Error scraping article:', error);
    return NextResponse.json({ error: 'Failed to scrape article' }, { status: 500 });
  }
}
