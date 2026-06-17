const yahooFinance = require('yahoo-finance2').default;

async function run() {
  try {
    console.log("Searching for TCS...");
    const searchRes = await yahooFinance.search("TCS", { quotesCount: 5 });
    console.log("Search Res:", JSON.stringify(searchRes.quotes, null, 2));

    console.log("Fetching quote for TCS.NS...");
    const quoteRes = await yahooFinance.quote("TCS.NS");
    console.log("Quote Res:", quoteRes.regularMarketPrice);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
