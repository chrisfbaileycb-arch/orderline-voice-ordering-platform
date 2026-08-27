import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AuthGuard from "./components/auth-guard.tsx";
import LandingPage from "./pages/landing/page.tsx";
import OrderPage from "./pages/order/page.tsx";
import BridgePage from "./pages/bridge/page.tsx";
import LocationBridgePage from "./pages/location-bridge/page.tsx";
import TabletDashboard from "./pages/dashboard/page.tsx";
import AnalyticsPage from "./pages/analytics/page.tsx";
import HubPage from "./pages/hub/page.tsx";
import IntegrationGuidePage from "./pages/integration-guide/page.tsx";
import KitchenPage from "./pages/kitchen/page.tsx";
import OnboardingPage from "./pages/onboarding/page.tsx";
import DevRoom from "./pages/dev/page.tsx";
import CustomersPage from "./pages/customers/page.tsx";
import SdkPage from "./pages/sdk/page.tsx";
import AdminPage from "./pages/admin/page.tsx";
import SimulatorPage from "./pages/simulator/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import PipelinePage from "./pages/pipeline/page.tsx";
import NotFound from "./pages/NotFound.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected operational routes */}
          <Route element={<AuthGuard />}>
            <Route path="/bridge" element={<BridgePage />} />
            <Route path="/bridge/:locationId" element={<LocationBridgePage />} />
            <Route path="/dashboard" element={<TabletDashboard />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/hub" element={<HubPage />} />
            <Route path="/integration" element={<IntegrationGuidePage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dev" element={<DevRoom />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/sdk" element={<SdkPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
