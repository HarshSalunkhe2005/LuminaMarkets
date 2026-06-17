import YahooFinanceClass from 'yahoo-finance2';

async function run() {
  try {
    const yahooFinance = new YahooFinanceClass();
    console.log("Searching for TCS...");
    const searchRes = await yahooFinance.search("TCS", { quotesCount: 2 });
    console.log("Search Res:", searchRes);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
