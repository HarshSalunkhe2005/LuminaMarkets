"use client";

import { useState, useEffect } from "react";
import { LineChart, Zap, Target, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import PredictionChart from "@/components/dashboard/PredictionChart";
import { supabase } from "@/utils/supabase/client";

type Timeframe = "1D" | "1W" | "1M" | "1Y";

export default function PredictionsPage() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Watchlist on Mount
  useEffect(() => {
    async function fetchWatchlist() {
      const { data } = await supabase.from('watchlist').select('*').order('added_at', { ascending: true });
      if (data && data.length > 0) {
        setWatchlist(data);
        setSelectedSymbol(data[0].symbol);
      } else {
        setLoading(false);
      }
    }
    fetchWatchlist();
  }, []);

  // 2. Fetch ML Prediction
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
          setWatchlist(prev => prev.map(w => w.symbol.replace('.NS', '') === selectedSymbol.replace('.NS', '') ? { ...w, trend: data.prediction.trend } : w));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to fetch ML predictions.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchPrediction();

    let pollInterval: NodeJS.Timeout;
    if (timeframe === "1D") {
      pollInterval = setInterval(fetchPrediction, 60000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedSymbol, timeframe]);

  if (watchlist.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <Target className="w-16 h-16 text-[#334e68]/30 dark:text-white/20" />
        <h2 className="text-2xl font-bold text-[#102a43] dark:text-white">No Predictions Available</h2>
        <p className="text-[#334e68] dark:text-[#d9e2ec] max-w-md">
          Please add stocks to your Watchlist to start receiving AI forecasts.
        </p>
        <Link href="/watchlist" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/25 flex items-center gap-2">
          Go to Watchlist <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  const selectedData = watchlist.find(w => w.symbol.replace('.NS', '') === selectedSymbol?.replace('.NS', '')) || watchlist[0];

  return (
    <div className="space-y-6 pb-8">
      <div className="pt-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#102a43] dark:text-white flex items-center gap-2">
            <LineChart className="w-8 h-8 text-[#334e68] dark:text-[#d9e2ec]" /> AI Predictions
          </h1>
          <p className="text-[#334e68] dark:text-[#d9e2ec] mt-1">Short-term forecasting using online learning.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Focus */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-[#102a43] dark:text-white tracking-tight uppercase">
                  {selectedData?.symbol.replace('.NS', '')}
                </h2>
                <p className="text-lg font-medium text-[#334e68] dark:text-[#d9e2ec] truncate max-w-[200px]">{selectedData?.name}</p>
              </div>
              {predictionData && !loading && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm ${
                  predictionData.prediction.trend === 'Bullish' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                  predictionData.prediction.trend === 'Bearish' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {predictionData.prediction.trend === 'Bullish' && <Zap className="w-5 h-5 fill-current" />}
                  {predictionData.prediction.trend.toUpperCase()} ({predictionData.prediction.confidence}% CONFIDENCE)
                </div>
              )}
            </div>
            
            {predictionData && !loading && (
              <div className="flex gap-4 text-sm text-[#334e68] dark:text-[#d9e2ec] font-medium bg-[#f0f4f8] dark:bg-[#0a192f] px-4 py-3 rounded-lg mb-4 border border-[#e2e8f0] dark:border-white/10 w-fit">
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
            
            <div className="h-[400px] flex items-center justify-center overflow-hidden">
               {loading ? (
                 <div className="flex flex-col items-center gap-2 text-[#334e68]">
                   <Loader2 className="w-8 h-8 animate-spin" />
                   <p>Generating forecast...</p>
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
            
            <div className="mt-6 p-5 bg-[#f0f4f8] dark:bg-[#0a192f] rounded-xl border border-blue-500/20">
               <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                 <Target className="w-4 h-4" /> AI Reasoning Engine
               </h3>
               <p className="text-[#334e68] dark:text-[#d9e2ec] leading-relaxed">
                 {loading ? "Analyzing parameters..." : predictionData?.reasoning}
               </p>
            </div>
          </div>
        </div>

        {/* Forecast List */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl text-[#102a43] dark:text-white">Watchlist Forecasts</h3>
          <div className="glass-card rounded-xl overflow-hidden divide-y divide-[#102a43]/10 dark:divide-white/10 max-h-[600px] overflow-y-auto">
            {watchlist.map(stock => {
              const isSelected = selectedSymbol === stock.symbol || selectedSymbol === `${stock.symbol}.NS`;
              return (
                <div 
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`)}
                  className={`p-5 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-white/50 dark:bg-white/10 border-blue-500 shadow-sm' : 'border-transparent hover:bg-white/50 dark:hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg text-[#102a43] dark:text-white uppercase">{stock.symbol.replace('.NS', '')}</span>
                    {stock.trend ? (
                      <span className={`text-sm font-bold px-2 py-1 rounded-md ${
                        stock.trend === 'Bullish' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' :
                        stock.trend === 'Bearish' ? 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30' :
                        'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                      }`}>{stock.trend}</span>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-[#334e68]/50" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#334e68] dark:text-[#d9e2ec] mt-2 truncate">{stock.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
