import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetails from './pages/DocumentDetails';
import Timeline from './pages/Timeline';
import Expenses from './pages/Expenses';
import HealthSummary from './pages/HealthSummary';
import Sharing from './pages/Sharing';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VaultProvider>
          <Routes>
            {/* Public */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — all wrapped in DashboardLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/documents"     element={<Documents />} />
              <Route path="/documents/:id" element={<DocumentDetails />} />
              <Route path="/timeline"      element={<Timeline />} />
              <Route path="/expenses"      element={<Expenses />} />
              <Route path="/health-summary"element={<HealthSummary />} />
              <Route path="/sharing"       element={<Sharing />} />
              <Route path="/profile"       element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </VaultProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
