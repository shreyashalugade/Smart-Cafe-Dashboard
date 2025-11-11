'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Menu, 
  X,
  LogOut,
  Users,
  Settings,
  Coffee
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getPermissions } from '@/lib/types';
import Button from '../ui/Button';

const getNavigation = (userRole: string, isAdmin: boolean) => {
  const permissions = getPermissions(userRole, false);
  
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'canViewDashboard' as const },
    { name: 'Orders', href: '/orders', icon: ShoppingBag, permission: 'canManageOrders' as const },
    { name: 'Inventory', href: '/inventory', icon: Package, permission: 'canManageInventory' as const },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'canViewAnalytics' as const },
    { name: 'Reports', href: '/reports', icon: FileText, permission: 'canGenerateReports' as const },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare, permission: 'canViewDashboard' as const },
  ];

  const adminNavigation = [
    ...baseNavigation.filter(item => permissions[item.permission]),
    { name: 'User Management', href: '/users', icon: Users, permission: 'canApproveUsers' as const },
  ];

  if (isAdmin) {
    return adminNavigation.filter(item => permissions[item.permission]);
  }

  return baseNavigation.filter(item => permissions[item.permission]);
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { userData, logout } = useAuth();
  
  const isAdmin = userData?.email === 'shreyash.alugade@gmail.com' || userData?.role === 'admin';
  const navigation = getNavigation(userData?.role || 'cafe_owner', isAdmin);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-100">
                Smart Cafe
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 text-blue-400 shadow-lg border border-blue-500/20'
                      : 'text-gray-300 hover:bg-gray-700 hover:shadow-sm'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className="w-5 h-5 mr-3 transition-all duration-300" />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-700">
            <div className="mb-4 p-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg backdrop-blur-sm border border-gray-600">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  isAdmin 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                    : 'bg-gradient-to-r from-green-500 to-teal-500'
                }`}>
                  {userData?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-100">
                    {userData?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {isAdmin ? 'Admin' : 'Cafe Owner'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-100"
            >
              <Menu className="w-6 h-6" />
            </Button>

            <div className="flex-1" />

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="bg-gray-900 text-gray-100 p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
