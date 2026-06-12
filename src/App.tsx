// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/Authcontext';
import { SettingsProvider } from './Context/SettingsContext';


import Layout from './componentes/Layout';
import Dashboard from './pages/Dashboard';
import NuevoGasto from './pages/NuevoGasto';
import Gastos from './pages/Gastos';
import Reportes from './pages/Reportes';
import Ajustes from './pages/Ajustes';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/nuevo" element={
              <ProtectedRoute>
                <NuevoGasto />
              </ProtectedRoute>
            } />
            
            <Route path="/gastos" element={
              <ProtectedRoute>
                <Gastos />
              </ProtectedRoute>
            } />
            
            <Route path="/reportes" element={
              <ProtectedRoute>
                <Reportes />
              </ProtectedRoute>
            } />
            
            <Route path="/ajustes" element={
              <ProtectedRoute>
                <Ajustes />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;