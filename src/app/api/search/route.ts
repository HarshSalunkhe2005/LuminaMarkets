import { NextResponse } from 'next/server';
import yahooFinanceModule from 'yahoo-finance2';

// Workaround for yahoo-finance2 v3
// @ts-ignore
const yahooFinance = typeof yahooFinanceModule === 'function' ? new yahooFinanceModule() : (yahooFinanceModule.default ? new yahooFinanceModule.default() : yahooFinanceModule);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await yahooFinance.search(query, { quotesCount: 20, newsCount: 0 });
    
    // Filter to only include Indian stocks (NSE and BSE) that are explicitly Equities
    const filtered = results.quotes.filter(q => 
      q.symbol && 
      (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')) &&
      q.quoteType === 'EQUITY' &&
      !q.symbol.startsWith('0P') // Double protection against strange mutual fund codes
    );
    
    const formatted = filtered.map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || q.exchange || (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE')
    })).slice(0, 6); // Return top 6 valid ones
    
    return NextResponse.json({ results: formatted });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
