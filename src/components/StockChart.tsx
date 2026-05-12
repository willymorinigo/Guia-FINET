import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Stock } from '../types';
import { formatCurrency } from '../lib/utils';

interface StockChartProps {
  stock: Stock;
}

export const StockChart: React.FC<StockChartProps> = ({ stock }) => {
  // Simulate historical data based on current price and EMAs
  const data = useMemo(() => {
    const points = 30;
    const basePrice = stock.price;
    const items = [];
    
    for (let i = points; i >= 0; i--) {
      const randomWalk = (Math.random() - 0.5) * (basePrice * 0.05);
      const daysAgo = i;
      const trend = (stock.price - stock.ema200) / 200 * (points - i);
      
      const price = basePrice - trend + randomWalk;
      const ema50 = stock.ema50 - (trend * 0.8);
      const ema200 = stock.ema200 - (trend * 0.5);
      
      items.push({
        date: `Day -${daysAgo}`,
        price: parseFloat(price.toFixed(2)),
        ema50: parseFloat(ema50.toFixed(2)),
        ema200: parseFloat(ema200.toFixed(2)),
      });
    }
    return items;
  }, [stock]);

  return (
    <div id="stock-chart-container" className="w-full h-[400px] mt-6 bg-[#1a1a1a] p-4 rounded-xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            fontSize={10} 
            tickFormatter={(val) => val === 'Day -0' ? 'Now' : val}
          />
          <YAxis 
            stroke="#666" 
            fontSize={10} 
            domain={['auto', 'auto']}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="price" 
            name="Price" 
            stroke="#fff" 
            strokeWidth={2} 
            dot={false}
            animationDuration={1500}
          />
          <Line 
            type="monotone" 
            dataKey="ema50" 
            name="EMA 50" 
            stroke="#3b82f6" 
            strokeWidth={1.5} 
            dot={false}
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="ema200" 
            name="EMA 200" 
            stroke="#ef4444" 
            strokeWidth={1.5} 
            dot={false}
            strokeDasharray="3 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
