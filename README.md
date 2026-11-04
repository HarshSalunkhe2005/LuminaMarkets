# LuminaMarkets

A stock dashboard for Indian markets with an AI prediction page. It shows live index and stock quotes, a personal
watchlist and market news, and for any symbol it combines price features, news sentiment and an online-learning
model into a trend call with a plain-language explanation.

[How the repo fits together (gitdiagram)](https://gitdiagram.com/HarshSalunkhe2005/LuminaMarkets)

## What it does

- **Dashboard and watchlist**: live quotes through `yahoo-finance2` (`src/app/api/quote`, `src/app/api/search`),
  watchlist stored in Supabase.
- **News**: category feeds from RSS (`src/app/api/news`) and a reader view that scrapes the article
  (`src/app/api/scrape`, cheerio).
- **Predictions** (`/predictions`), served by the Python backend's `POST /predict`:
  1. price features from yfinance (moving-average gap, volatility, daily return)
  2. the five latest Google News headlines for the symbol, scored for sentiment by Gemini
  3. an `SGDRegressor` that keeps learning with every request (`partial_fit`, state in `stock_model.pkl`)
  4. Gemini writes the reasoning behind the predicted trend
  5. chart data for the selected period, drawn with Recharts

Predictions are an experiment, not financial advice.

## Stack

Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Supabase.
Backend: FastAPI, scikit-learn, yfinance, feedparser, Google Gemini.

## Run it locally

Frontend:

```bash
npm install
npm run dev              # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Backend (needed for the Predictions page; the frontend calls `http://127.0.0.1:8000/predict`):

```bash
cd backend
pip install fastapi uvicorn scikit-learn numpy yfinance feedparser google-generativeai
export GEMINI_API_KEY=...          # Windows: set GEMINI_API_KEY=...
uvicorn main:app --reload --port 8000
```

## Project layout

```
src/app/              pages: dashboard, watchlist, news, predictions; api/ routes for quote, search, news, scrape
src/components/       Navbar, PredictionChart
backend/main.py       FastAPI app and the /predict pipeline
backend/ml_model.py   online SGD regressor with a persisted scaler
backend/scraper.py    Google News RSS headlines per symbol
backend/gemini_service.py   sentiment score and reasoning text
```
