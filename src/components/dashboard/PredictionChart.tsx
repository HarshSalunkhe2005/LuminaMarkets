"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type Timeframe = "1D" | "1W" | "1M" | "1Y";

interface PredictionChartProps {
  data: any[];
  timeframe?: Timeframe;
  onTimeframeChange?: (t: Timeframe) => void;
  showPredictionLine?: boolean;
  previousClose?: number | null;
  openPrice?: number | null;
}

export default function PredictionChart({ 
  data, 
  timeframe = "1M", 
  onTimeframeChange, 
  showPredictionLine = true,
  previousClose,
  openPrice
}: PredictionChartProps) {
  // Find the boundary between historical and prediction data
  const predictionStartIndex = data.findIndex(d => d.isPrediction);
  const separatorDate = predictionStartIndex > 0 ? data[predictionStartIndex - 1].date : null;

  return (
    <div className="w-full h-full relative">
      {/* Timeframe Toggles */}
      {onTimeframeChange && (
        <div className="absolute top-2 right-4 z-10 flex bg-[#f0f4f8] dark:bg-[#0a192f] p-1 rounded-lg border border-[#e2e8f0] dark:border-white/10">
          {(['1D', '1W', '1M', '1Y'] as Timeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => onTimeframeChange(t)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                timeframe === t 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-[#829ab1] hover:text-[#102a43] dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="w-full h-full min-h-[350px] pt-10 pb-4">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#829ab1', fontSize: 12 }}
              dy={10}
              minTickGap={20}
            />
            <YAxis 
              domain={[
                (dataMin: number) => {
                  let min = dataMin;
                  if (timeframe === "1D") {
                    if (previousClose) min = Math.min(min, previousClose);
                    if (openPrice) min = Math.min(min, openPrice);
                  }
                  return min * 0.99;
                },
                (dataMax: number) => {
                  let max = dataMax;
                  if (timeframe === "1D") {
                    if (previousClose) max = Math.max(max, previousClose);
                    if (openPrice) max = Math.max(max, openPrice);
                  }
                  return max * 1.01;
                }
              ]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#829ab1', fontSize: 12 }}
              tickFormatter={(value) => `₹${Math.round(value)}`}
              width={60}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.15} />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />

            {showPredictionLine && separatorDate && (
              <ReferenceLine x={separatorDate} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: ' AI Forecast', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
            )}

            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 3, style: { filter: 'drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.8))' } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
