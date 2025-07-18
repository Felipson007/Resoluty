import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import CustomerSuccess from './pages/CustomerSuccess';
import Gestao from './pages/Gestao';
import Financeiro from './pages/Financeiro';
import Comercial from './pages/Comercial';
import Administrativo from './pages/Administrativo';

const SIDEBAR_WIDTH = 240;

// Componente para verificar autenticação
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const hideSidebar = location.pathname === '/login';
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  // Se não estiver autenticado e não estiver na página de login, redirecionar
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado e estiver na página de login, redirecionar para home
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div style={{ display: 'flex' }}>
      {!hideSidebar && <Sidebar />}
      <div style={{ flex: 1, paddingLeft: !hideSidebar ? SIDEBAR_WIDTH : 0, transition: 'padding-left 0.2s' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/gestao" element={
            <ProtectedRoute>
              <Gestao />
            </ProtectedRoute>
          } />
          <Route path="/financeiro" element={
            <ProtectedRoute>
              <Financeiro />
            </ProtectedRoute>
          } />
          <Route path="/comercial" element={
            <ProtectedRoute>
              <Comercial />
            </ProtectedRoute>
          } />
          <Route path="/customer-success" element={
            <ProtectedRoute>
              <CustomerSuccess />
            </ProtectedRoute>
          } />
          <Route path="/administrativo" element={
            <ProtectedRoute>
              <Administrativo />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
