import { Metadata } from 'next';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';

export const metadata: Metadata = {
  title: 'Super Admin - Smart Cafe Dashboard',
  description: 'Super Admin control panel for managing cafes and user approvals',
};

export default function SuperAdminPage() {
  return <SuperAdminPanel />;
}