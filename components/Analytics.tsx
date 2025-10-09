
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AnalyticsIcon from './icons/AnalyticsIcon';

const mockSalesData = [
  { name: 'Dog Lover Tee', sales: 4000 },
  { name: 'Retro Gamer', sales: 3000 },
  { name: 'Christmas Cat', sales: 2000 },
  { name: 'Funny Quote', sales: 2780 },
  { name: 'Vintage Floral', sales: 1890 },
  { name: 'Mountain Hike', sales: 2390 },
  { name: 'Coffee Addict', sales: 3490 },
];

const Analytics: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <AnalyticsIcon className="h-10 w-10 text-brand-primary" />
        <h1 className="text-3xl font-bold text-white">Sales Analytics</h1>
      </div>
      <p className="text-slate-400">
        Track sales performance for products created through the platform to create a data-driven feedback loop.
      </p>

      <div className="bg-slate-800 p-6 rounded-lg h-[500px]">
        <h2 className="text-xl font-semibold mb-6">Top Performing Designs</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={mockSalesData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#e2e8f0'
              }}
              cursor={{ fill: '#334155' }}
            />
            <Legend />
            <Bar dataKey="sales" fill="#14b8a6" name="Sales (USD)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
