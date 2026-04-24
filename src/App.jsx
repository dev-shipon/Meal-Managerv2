import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider, ConfirmDialogProvider } from './contexts/ToastContext';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const MealApp = lazy(() => import('./pages/MealApp'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const JoinMess = lazy(() => import('./pages/JoinMess'));
const Login = lazy(() => import('./pages/Login'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const Blog = lazy(() => import('./pages/Blog'));
const Developer = lazy(() => import('./pages/Developer'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));

import { SmoothLoader } from './components/Loader';

function PageFallback() {
  return <SmoothLoader show={true} />;
}

function App() {
  const location = useLocation();

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />

                <Route path="/join/:groupId" element={<JoinMess />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/developer" element={<Developer />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                <Route
                  path="/app/:groupId"
                  element={
                    <ProtectedRoute>
                      <MealApp />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AnimatePresence>
          </Suspense>
          {/* Global UI overlays */}
          <ConfirmDialog />
          <Toast />
        </AuthProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

export default App;
