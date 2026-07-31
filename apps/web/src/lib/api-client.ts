import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // send httpOnly cookies on every request
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — attempt silent refresh once, then redirect to /login
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request until refresh completes
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await apiClient.post<{
        data: { user: import('@/store/auth.store').AuthUser; accessToken: string };
      }>('/api/v1/auth/refresh');

      const { user, accessToken } = res.data.data;
      useAuthStore.getState().setAuth(user, accessToken);

      refreshQueue.forEach((cb) => cb(accessToken));
      refreshQueue = [];

      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch {
      useAuthStore.getState().clearAuth();
      refreshQueue = [];
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
