import { Metadata } from 'next';
import UserManagement from '@/components/admin/UserManagement';

export const metadata: Metadata = {
  title: 'User Management - Smart Cafe Dashboard',
  description: 'Manage users and approve new registrations',
};

export default function UserManagementPage() {
  return <UserManagement />;
}