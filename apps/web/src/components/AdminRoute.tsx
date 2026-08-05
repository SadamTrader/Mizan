import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

/**
 * Route-level guard — redirects non-ADMIN users to /dashboard.
 * Must be used inside a ProtectedRoute (assumes user is already authenticated).
 */
export function AdminRoute({ children }: Props) {
  const role = useAuthStore((s) => s.user?.role);

  if (role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
