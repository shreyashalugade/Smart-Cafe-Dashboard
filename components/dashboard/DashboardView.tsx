'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ShoppingBag, DollarSign, Package, Star, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, getTodayStart } from '@/lib/utils/helpers';
import { useAuth } from '@/lib/firebase/auth-context';
import PermissionGate from '../auth/PermissionGate';
import type { Order, InventoryItem, Feedback } from '@/lib/types';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  lowStockItems: number;
  todayOrders: number;
  todayRevenue: number;
  averageRating: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    lowStockItems: 0,
    todayOrders: 0,
    todayRevenue: 0,
    averageRating: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      let orders: Order[] = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      let inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));

      const feedbackSnapshot = await getDocs(collection(db, 'feedback'));
      let feedback: Feedback[] = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));

      // Filter by cafe if user is not super admin
      if (userData?.role !== 'super_admin' && userData?.cafeId) {
        orders = orders.filter(order => order.cafeId === userData.cafeId);
        inventory = inventory.filter(item => item.cafeId === userData.cafeId);
        feedback = feedback.filter(fb => fb.cafeId === userData.cafeId);
      }

      const todayStart = getTodayStart();
      const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);

      const activeOrders = orders.filter(o => 
        o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
      ).length;

      const lowStock = inventory.filter(i => i.quantity <= i.minStock).length;

      const averageRating = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0;

      setStats({
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        activeOrders,
        lowStockItems: lowStock,
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
        averageRating
      });

      // Generate sales trend data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const salesByDay = last7Days.map(date => {
        const dayOrders = orders.filter(o => o.createdAt.split('T')[0] === date);
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
          orders: dayOrders.length
        };
      });
      setSalesData(salesByDay);

      // Category distribution
      const itemCounts: { [key: string]: number } = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      });

      const topItems = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
      setCategoryData(topItems);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover bounce-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Today Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 gradient-text">
                  {stats.todayOrders}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg float-animation">
                <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bounce-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Today Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 gradient-text">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg float-animation pulse-slow">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bounce-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 gradient-text">
                  {stats.activeOrders}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg float-animation">
                <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bounce-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 gradient-text">
                  {stats.averageRating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg float-animation wiggle">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
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
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.lowStockItems > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>{stats.lowStockItems}</strong> items are running low on stock. Check inventory.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
