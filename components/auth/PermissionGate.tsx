'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getPermissions } from '@/lib/types';

interface PermissionGateProps {
  permission: keyof ReturnType<typeof getPermissions>;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { userData } = useAuth();
  
  if (!userData) {
    return null;
  }
  
  const isGlobalAdmin = userData.email === 'shreyash.alugade@gmail.com';
  const permissions = getPermissions(userData.role, isGlobalAdmin);
  
  if (permissions[permission]) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// HOC for easier usage
export function withPermission<P extends object>(
  Component: React.ComponentType<P>, 
  permission: keyof ReturnType<typeof getPermissions>
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate permission={permission}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}