import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useSilentRefresh } from '@/modules/auth/hooks/useSilentRefresh';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { PartiesListPage } from '@/modules/parties/pages/PartiesListPage';
import { ItemsListPage } from '@/modules/items/pages/ItemsListPage';
import { WarehousesListPage } from '@/modules/warehouses/pages/WarehousesListPage';
import { VehiclesListPage } from '@/modules/vehicles/pages/VehiclesListPage';
import { PurchasesListPage } from '@/modules/purchases/pages/PurchasesListPage';
import { PurchaseFormPage } from '@/modules/purchases/pages/PurchaseFormPage';
import { PurchaseDetailPage } from '@/modules/purchases/pages/PurchaseDetailPage';
import { SalesListPage } from '@/modules/sales/pages/SalesListPage';
import { SaleFormPage } from '@/modules/sales/pages/SaleFormPage';
import { SaleDetailPage } from '@/modules/sales/pages/SaleDetailPage';
import { ProfitReportPage } from '@/modules/reports/pages/ProfitReportPage';
import { PaymentsListPage } from '@/modules/payments/pages/PaymentsListPage';
import { PaymentFormPage } from '@/modules/payments/pages/PaymentFormPage';
import { PaymentDetailPage } from '@/modules/payments/pages/PaymentDetailPage';
import { PartyLedgerPage } from '@/modules/parties/pages/PartyLedgerPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppRoutes() {
  const { ready } = useSilentRefresh();

  // Don't render routes until silent refresh attempt completes —
  // prevents a flash redirect to /login for users who are still logged in
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/parties"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PartiesListPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/items" element={<ProtectedRoute><DashboardLayout><ItemsListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/warehouses" element={<ProtectedRoute><DashboardLayout><WarehousesListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute><DashboardLayout><VehiclesListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><DashboardLayout><PurchasesListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/purchases/new" element={<ProtectedRoute><DashboardLayout><PurchaseFormPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/purchases/:id" element={<ProtectedRoute><DashboardLayout><PurchaseDetailPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><DashboardLayout><SalesListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/sales/new" element={<ProtectedRoute><DashboardLayout><SaleFormPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/sales/:id" element={<ProtectedRoute><DashboardLayout><SaleDetailPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/reports/profit" element={<ProtectedRoute><DashboardLayout><ProfitReportPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><DashboardLayout><PaymentsListPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/payments/new" element={<ProtectedRoute><DashboardLayout><PaymentFormPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/payments/:id" element={<ProtectedRoute><DashboardLayout><PaymentDetailPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parties/:id/ledger" element={<ProtectedRoute><DashboardLayout><PartyLedgerPage /></DashboardLayout></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
