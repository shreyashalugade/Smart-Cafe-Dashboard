'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import Layout from '@/components/layout/Layout';
import OrdersView from '@/components/orders/OrdersView';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <Layout>
      <OrdersView />
    </Layout>
  );
}
