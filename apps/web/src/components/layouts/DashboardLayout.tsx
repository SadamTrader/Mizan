import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

type Props = { children: ReactNode };

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  }`;

export function DashboardLayout({ children }: Props) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await apiClient.post('/api/v1/auth/logout'); } catch { /* clear anyway */ }
    clearAuth();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col overflow-y-auto">
        <div className="px-6 py-5 border-b shrink-0">
          <span className="font-bold text-lg text-gray-800">Scrap ERP</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/dashboard" className={navCls}>Dashboard</NavLink>
          <NavLink to="/parties" className={navCls}>Parties</NavLink>
          <NavLink to="/purchases" className={navCls}>Purchases</NavLink>
          <NavLink to="/sales" className={navCls}>Sales</NavLink>
          <NavLink to="/payments" className={navCls}>Payments</NavLink>
          <NavLink to="/inventory" className={navCls}>Inventory</NavLink>
          <NavLink to="/expenses" className={navCls}>Expenses</NavLink>

          {/* Master Data group */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Master Data</p>
          </div>
          <NavLink to="/items" className={navCls}>Scrap Items</NavLink>
          <NavLink to="/warehouses" className={navCls}>Warehouses</NavLink>
          <NavLink to="/vehicles" className={navCls}>Vehicles</NavLink>
          {/* More nav links added as modules are built */}

          {/* Reports — Admin only */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reports</p>
              </div>
              <NavLink to="/reports/profit" className={navCls}>Profit Report</NavLink>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t shrink-0">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 shrink-0">
          <h1 className="text-sm font-medium text-gray-500">
            Welcome back, <span className="text-gray-900">{user?.name}</span>
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
