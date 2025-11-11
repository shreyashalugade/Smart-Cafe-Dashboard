'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils/helpers';
import type { Order } from '@/lib/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders: Order[] = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));

      // Sales trend for last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const salesByDay = last30Days.map(date => {
        const dayOrders = orders.filter(o => o.createdAt.split('T')[0] === date);
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
          orders: dayOrders.length
        };
      });
      setSalesTrend(salesByDay);

      // Top selling items
      const itemCounts: { [key: string]: { quantity: number; revenue: number } } = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { quantity: 0, revenue: 0 };
          }
          itemCounts[item.name].quantity += item.quantity;
          itemCounts[item.name].revenue += item.subtotal;
        });
      });

      const topSellingItems = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }));
      setTopItems(topSellingItems);

      // Hourly activity
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourOrders = orders.filter(o => {
          const orderHour = new Date(o.createdAt).getHours();
          return orderHour === hour;
        });
        return {
          hour: `${hour}:00`,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum, o) => sum + o.total, 0)
        };
      });
      setHourlyActivity(hourlyData);

      // Category distribution
      const categories: { [key: string]: number } = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          const category = item.name.split(' ')[0]; // Simple categorization
          categories[category] = (categories[category] || 0) + item.subtotal;
        });
      });

      const categoryDistribution = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));
      setCategoryData(categoryDistribution);

      // Simple predictions
      const last7DaysRevenue = salesByDay.slice(-7).reduce((sum, day) => sum + day.revenue, 0);
      const previous7DaysRevenue = salesByDay.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0);
      const trendPercentage = ((last7DaysRevenue - previous7DaysRevenue) / previous7DaysRevenue) * 100;

      setPredictions({
        nextWeekRevenue: last7DaysRevenue * (1 + trendPercentage / 100),
        nextWeekOrders: Math.round(salesByDay.slice(-7).reduce((sum, day) => sum + day.orders, 0) * (1 + trendPercentage / 100)),
        trend: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable',
        trendPercentage: Math.abs(trendPercentage)
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>

      {predictions && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Next Week Forecast
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Expected Revenue: <strong>{formatCurrency(predictions.nextWeekRevenue)}</strong>
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Expected Orders: <strong>{predictions.nextWeekOrders}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
                {predictions.trend === 'up' && (
                  <>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      +{predictions.trendPercentage.toFixed(1)}%
                    </span>
                  </>
                )}
                {predictions.trend === 'down' && (
                  <>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      -{predictions.trendPercentage.toFixed(1)}%
                    </span>
                  </>
                )}
                {predictions.trend === 'stable' && (
                  <>
                    <Minus className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Stable</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItems.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Items Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Units Sold
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {topItems.map((item, index) => (
                  <tr key={item.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
