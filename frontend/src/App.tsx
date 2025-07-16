import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import CustomerSuccess from './pages/CustomerSuccess';
import BreadcrumbsNav from './components/BreadcrumbsNav';
import Gestao from './pages/Gestao';
import Financeiro from './pages/Financeiro';
import Comercial from './pages/Comercial';
import Administrativo from './pages/Administrativo';

const SIDEBAR_WIDTH = 240;

function AppRoutes() {
  const location = useLocation();
  const hideSidebar = location.pathname === '/login';
  return (
    <div style={{ display: 'flex' }}>
      {!hideSidebar && <Sidebar />}
      <div style={{ flex: 1, paddingLeft: !hideSidebar ? SIDEBAR_WIDTH : 0, transition: 'padding-left 0.2s' }}>
        {!hideSidebar && <BreadcrumbsNav />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/gestao" element={<Gestao />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/comercial" element={<Comercial />} />
          <Route path="/customer-success" element={<CustomerSuccess />} />
          <Route path="/administrativo" element={<Administrativo />} />
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
