import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function ProtectedRoute({ children }: Props) {
  const { user, accessToken } = useAuthStore();

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
