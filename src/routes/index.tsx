import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { AppShell } from '../components/AppShell';
import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/Login';
import { FirstAccess } from '../pages/FirstAccess';
import { Dashboard } from '../pages/Dashboard';
import { PDV } from '../pages/PDV';
import { SaasAccess } from '../pages/SaasAccess';
import { SaasConsole } from '../pages/SaasConsole';
import { CadastroPage } from '../pages/CadastroPage';
import { EstoquePage } from '../pages/EstoquePage';
import { FiadosPage } from '../pages/FiadosPage';
import { VasilhamesPage } from '../pages/VasilhamesPage';
import { VendasPage } from '../pages/VendasPage';
import { CaixasPage } from '../pages/CaixasPage';
import { DeliveryPage } from '../pages/DeliveryPage';
import { FinanceiroPage } from '../pages/FinanceiroPage';
import { RelatoriosPage } from '../pages/RelatoriosPage';
import { ConfiguracoesPage } from '../pages/ConfiguracoesPage';

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/primeiro-acesso" element={<FirstAccess />} />
      <Route path="/saas/acesso" element={<SaasAccess />} />
      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pdv" element={<PDV />} />
          <Route path="/vendas" element={<VendasPage />} />
          <Route path="/caixas" element={<CaixasPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/produtos" element={<CadastroPage resource="produtos" />} />
          <Route path="/categorias" element={<CadastroPage resource="categorias" />} />
          <Route path="/lotes" element={<CadastroPage resource="lotes" />} />
          <Route path="/fornecedores" element={<CadastroPage resource="fornecedores" />} />
          <Route path="/clientes" element={<CadastroPage resource="clientes" />} />
          <Route path="/funcionarios" element={<CadastroPage resource="funcionarios" />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/fiados" element={<FiadosPage />} />
          <Route path="/vasilhames" element={<VasilhamesPage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
        <Route path="/saas/painel" element={<SaasConsole />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
