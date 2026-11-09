import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { PDV } from '../pages/PDV';
import { SaasAccess } from '../pages/SaasAccess';
import { SaasConsole } from '../pages/SaasConsole';

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/saas/acesso" element={<SaasAccess />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pdv" element={<PDV />} />
        <Route path="/saas/painel" element={<SaasConsole />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
