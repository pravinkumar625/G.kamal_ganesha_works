import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ParallaxBg from './components/ParallaxBg';
import Navbar from './components/Navbar';

// Pages
import LandingPage from './pages/LandingPage';
import CustomerLoginPage from './pages/customer/LoginPage';
import CustomerDashboard from './pages/customer/Dashboard';
import AdminLoginPage from './pages/admin/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';

// Route protection for Customers
const CustomerRoute = ({ children }) => {
  const token = localStorage.getItem('customerToken');
  return token ? children : <Navigate to="/login/customer" replace />;
};

// Route protection for Admins
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login/admin" replace />;
};

function App() {
  return (
    <Router>
      <div className="relative min-h-screen flex flex-col justify-between">
        {/* Animated parallax background with gold mandalas & diyas */}
        <ParallaxBg />
        
        {/* Global luxury glass navbar */}
        <Navbar />

        {/* Router switches */}
        <div className="relative z-10 flex-grow">
          <Routes>
            {/* Public Welcome Front Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Customer Authentication & Dashboard */}
            <Route path="/login/customer" element={<CustomerLoginPage />} />
            <Route
              path="/customer/dashboard"
              element={
                <CustomerRoute>
                  <CustomerDashboard />
                </CustomerRoute>
              }
            />

            {/* Admin Authentication & Control Dashboard */}
            <Route path="/login/admin" element={<AdminLoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Catch-all fallback redirections */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
