import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';

type RefreshResponse = {
  data: {
    user: { id: string; name: string; email: string; role: string };
    accessToken: string;
  };
};

/**
 * On app startup, if there's no access token in memory,
 * attempt a silent refresh using the httpOnly cookie.
 * Returns `ready: true` once the attempt completes (success or failure).
 */
export function useSilentRefresh() {
  const { accessToken, setAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setReady(true);
      return;
    }

    apiClient
      .post<RefreshResponse>('/api/v1/auth/refresh')
      .then((res) => {
        const { user, accessToken: token } = res.data.data;
        setAuth(user, token);
      })
      .catch(() => {
        // No valid session — that's fine, user will see /login
      })
      .finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready };
}
