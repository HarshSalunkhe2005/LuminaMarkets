"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Activity, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import PredictionChart from "@/components/dashboard/PredictionChart";
import { supabase } from "@/utils/supabase/client";

type Timeframe = "1D" | "1W" | "1M" | "1Y";

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic live indices state
  const [indices, setIndices] = useState([
    { name: "NIFTY 50", symbol: "^NSEI", value: "...", change: "...", isPositive: true },
    { name: "SENSEX", symbol: "^BSESN", value: "...", change: "...", isPositive: true },
    { name: "BANKNIFTY", symbol: "^NSEBANK", value: "...", change: "...", isPositive: true },
  ]);

  // 1. Fetch Watchlist and Indices on Mount
  useEffect(() => {
    // Fetch live data for the indices
    indices.forEach(async (idx) => {
      try {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(idx.symbol)}`);
        const quote = await res.json();
        if (!quote.error) {
          setIndices(prev => prev.map(i => i.symbol === idx.symbol ? { ...i, value: quote.price, change: quote.change, isPositive: quote.isPositive } : i));
        }
      } catch (e) {}
    });

    async function fetchWatchlist() {
      const { data } = await supabase.from('watchlist').select('*').order('added_at', { ascending: true });
      if (data && data.length > 0) {
        // Initialize prices and trends as empty
        const initialWatchlist = data.map(d => ({ ...d, price: '...', trend: '...' }));
        setWatchlist(initialWatchlist);
        setSelectedSymbol(data[0].symbol);
        
        // Fetch live quotes for the sidebar
        initialWatchlist.forEach(async (item) => {
          try {
            const res = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
            const quote = await res.json();
            setWatchlist(prev => prev.map(w => w.symbol === item.symbol ? { ...w, price: quote.price, isPositive: quote.isPositive } : w));
          } catch (e) {}
        });
      } else {
        setLoading(false);
      }
    }
    fetchWatchlist();
  }, []);

  // 2. Fetch ML Prediction when selectedSymbol or timeframe changes
  useEffect(() => {
    if (!selectedSymbol) return;

    let isMounted = true;
    
    async function fetchPrediction() {
      setLoading(true);
      setError(null);
      
      const periodMap = { "1D": "1d", "1W": "5d", "1M": "1mo", "1Y": "1y" };
      const intervalMap = { "1D": "1m", "1W": "15m", "1M": "1d", "1Y": "1d" };

      try {
        const res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            symbol: selectedSymbol,
            period: periodMap[timeframe],
            interval: intervalMap[timeframe]
          })
        });
        
        if (!res.ok) throw new Error("Backend not reachable");
        const data = await res.json();
        
        const formattedChartData = data.chart_data.map((d: any) => ({
          date: d.date,
          price: d.historical,
          isPrediction: false
        }));
        
        // Only append AI Prediction point if viewing 1M or 1Y (avoid geometric distortion on intraday charts)
        const showPredictionLine = timeframe === "1M" || timeframe === "1Y";
        if (showPredictionLine && formattedChartData.length > 0) {
          const lastPrice = formattedChartData[formattedChartData.length - 1].price;
          const trendMultiplier = data.prediction.trend === "Bullish" ? 1.02 : data.prediction.trend === "Bearish" ? 0.98 : 1.0;
          formattedChartData.push({
            date: timeframe === "1M" ? "Next Wk" : "Next Mo",
            price: parseFloat((lastPrice * trendMultiplier).toFixed(2)),
            isPrediction: true
          });
        }

        if (isMounted) {
          setPredictionData({ ...data, chartData: formattedChartData });
          
          // Update sidebar trend for the selected symbol
          setWatchlist(prev => prev.map(w => 
            w.symbol.replace('.NS', '') === selectedSymbol.replace('.NS', '') 
              ? { ...w, trend: data.prediction.trend } 
              : w
          ));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to fetch ML predictions. Is the Python backend running?");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchPrediction();

    // 3. Auto-poll if 1D is selected
    let pollInterval: NodeJS.Timeout;
    if (timeframe === "1D") {
      pollInterval = setInterval(fetchPrediction, 60000); // refresh every minute
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedSymbol, timeframe]);

  if (watchlist.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <Activity className="w-16 h-16 text-[#334e68]/30 dark:text-white/20" />
        <h2 className="text-2xl font-bold text-[#102a43] dark:text-white">Your Dashboard is Empty</h2>
        <p className="text-[#334e68] dark:text-[#d9e2ec] max-w-md">
          You haven't added any stocks to your watchlist yet. Build your portfolio to activate the AI Forecasting engine.
        </p>
        <Link href="/watchlist" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/25 flex items-center gap-2">
          Add Stocks to Watchlist <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#102a43] dark:text-white">
          Market Overview
        </h1>
        <p className="text-[#334e68] dark:text-[#d9e2ec] mt-1">
          Your daily pulse on the stock market.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {indices.map((index) => (
          <div key={index.name} className="glass-card rounded-xl p-5 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-[#334e68] dark:text-[#d9e2ec]">{index.name}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#102a43] dark:text-white">{index.value}</span>
              <span className={`flex items-center text-sm font-medium ${index.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {index.isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {index.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#102a43] dark:text-white uppercase">
              {selectedSymbol?.replace('.NS', '')} AI Forecast
            </h2>
            {predictionData && !loading && (
              <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                predictionData.prediction.trend === 'Bullish' ? 'bg-green-100 text-green-700' : 
                predictionData.prediction.trend === 'Bearish' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {predictionData.prediction.trend} ({predictionData.prediction.confidence}% confidence)
              </span>
            )}
          </div>
          
          {predictionData && !loading && (
            <div className="flex gap-4 text-sm text-[#334e68] dark:text-[#d9e2ec] font-medium bg-white/50 dark:bg-white/5 px-4 py-2 rounded-lg inline-flex">
              <span>Start price: ₹{predictionData.features.open_price?.toFixed(2) || "N/A"}</span>
              {(() => {
                const now = new Date();
                const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
                const hours = istTime.getHours();
                const minutes = istTime.getMinutes();
                const day = istTime.getDay();
                
                const isWeekend = day === 0 || day === 6;
                const isBeforeOpen = hours < 9 || (hours === 9 && minutes < 15);
                const isAfterClose = hours > 15 || (hours === 15 && minutes >= 30);
                const isMarketClosed = isWeekend || isBeforeOpen || isAfterClose;

                if (isMarketClosed) {
                  return <span>Closing price: ₹{predictionData.features.current_price?.toFixed(2) || "N/A"}</span>;
                }
                return null;
              })()}
            </div>
          )}
          
          <div className="glass-card rounded-xl h-[400px] flex items-center justify-center overflow-hidden">
             {loading ? (
               <div className="flex flex-col items-center gap-2 text-[#334e68]">
                 <Loader2 className="w-8 h-8 animate-spin" />
                 <p>Running ML models & analyzing news...</p>
               </div>
             ) : error ? (
               <p className="text-red-500">{error}</p>
             ) : (
               <PredictionChart 
                 data={predictionData.chartData} 
                 timeframe={timeframe} 
                 onTimeframeChange={setTimeframe}
                 showPredictionLine={timeframe === "1M" || timeframe === "1Y"}
                 previousClose={predictionData.features.previous_close}
                 openPrice={predictionData.features.open_price}
               />
             )}
          </div>
          
          <div className="glass-card rounded-xl p-4 mt-4">
            <p className="text-sm text-[#334e68] dark:text-[#d9e2ec]">
              <strong className="text-[#102a43] dark:text-white">Model Reasoning:</strong>{' '}
              {loading ? "Analyzing latest data..." : predictionData?.reasoning}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#102a43] dark:text-white">Your Watchlist</h2>
            <Link href="/watchlist" className="text-sm text-blue-600 hover:underline dark:text-blue-400 font-medium">Manage</Link>
          </div>
          
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="divide-y divide-[#102a43]/10 dark:divide-white/10 max-h-[500px] overflow-y-auto">
              {watchlist.map((stock) => {
                const isSelected = selectedSymbol === stock.symbol || selectedSymbol === `${stock.symbol}.NS`;
                return (
                  <div 
                    key={stock.symbol} 
                    onClick={() => setSelectedSymbol(stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`)}
                    className={`p-4 transition-colors cursor-pointer border-l-4 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-[#102a43] dark:text-white">{stock.symbol.replace('.NS', '')}</h4>
                        <p className="text-xs text-[#334e68] dark:text-[#d9e2ec] truncate max-w-[120px]">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${stock.isPositive === false ? 'text-red-500' : stock.isPositive === true ? 'text-green-500' : 'text-[#102a43] dark:text-white'}`}>
                          {stock.price !== '...' ? `₹${stock.price}` : <Loader2 className="w-4 h-4 animate-spin inline-block opacity-50"/>}
                        </p>
                        {stock.trend && stock.trend !== '...' && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                            stock.trend === 'Bullish' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            stock.trend === 'Bearish' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {stock.trend}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
