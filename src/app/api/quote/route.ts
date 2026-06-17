import { NextResponse } from 'next/server';
import yahooFinanceModule from 'yahoo-finance2';

// Workaround for yahoo-finance2 v3
// @ts-ignore
const yahooFinance = typeof yahooFinanceModule === 'function' ? new yahooFinanceModule() : (yahooFinanceModule.default ? new yahooFinanceModule.default() : yahooFinanceModule);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // We add .NS to try getting the NSE version if it's an Indian stock
    // Since the user is investing in Indian markets (ET Markets etc)
    const querySymbol = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('^') ? symbol : `${symbol}.NS`;
    const quote = await yahooFinance.quote(querySymbol);
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const price = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose || price;
    const changeValue = price - previousClose;
    const changePercent = (changeValue / previousClose) * 100;

    return NextResponse.json({
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || symbol,
      price: price.toFixed(2),
      change: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      isPositive: changePercent >= 0
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
