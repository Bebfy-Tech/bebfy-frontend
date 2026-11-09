import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { validSlug } from '../services/tenantUrls';
import { AppShell } from '../components/AppShell';
import { LandingPage } from '../pages/LandingPage';
import { StoreLookup } from '../pages/StoreLookup';
import { Login } from '../pages/Login';
import { FirstAccess } from '../pages/FirstAccess';
import { Dashboard } from '../pages/Dashboard';
import { PDV } from '../pages/PDV';
import { SaasAccess } from '../pages/SaasAccess';
import { SaasConsole } from '../pages/SaasConsole';
import { CadastroPage } from '../pages/CadastroPage';
import { EstoquePage } from '../pages/EstoquePage';
import { ImportarXmlPage } from '../pages/ImportarXmlPage';
import { AjudaPage } from '../pages/AjudaPage';
import { FiadosPage } from '../pages/FiadosPage';
import { VasilhamesPage } from '../pages/VasilhamesPage';
import { VendasPage } from '../pages/VendasPage';
import { CaixasPage } from '../pages/CaixasPage';
import { DeliveryPage } from '../pages/DeliveryPage';
import { FinanceiroPage } from '../pages/FinanceiroPage';
import { RelatoriosPage } from '../pages/RelatoriosPage';
import { ConfiguracoesPage } from '../pages/ConfiguracoesPage';

function TenantGate() {
  const { tenant } = useParams();
  if (!tenant || !validSlug(tenant) || tenant !== tenant.toLowerCase()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/acessar" element={<StoreLookup />} />
      <Route path="/SaaS/admin" element={<SaasAccess />} />
      <Route path="/SaaS/primeiro-acesso" element={<FirstAccess />} />
      <Route element={<PrivateRoute saas />}>
        <Route path="/SaaS/painel" element={<SaasConsole />} />
      </Route>
      <Route path="/:tenant" element={<TenantGate />}>
        <Route index element={<Login />} />
        <Route path="primeiro-acesso" element={<FirstAccess />} />
        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pdv" element={<PDV />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="caixas" element={<CaixasPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="produtos" element={<CadastroPage resource="produtos" />} />
            <Route path="categorias" element={<CadastroPage resource="categorias" />} />
            <Route path="lotes" element={<CadastroPage resource="lotes" />} />
            <Route path="fornecedores" element={<CadastroPage resource="fornecedores" />} />
            <Route path="clientes" element={<CadastroPage resource="clientes" />} />
            <Route path="funcionarios" element={<CadastroPage resource="funcionarios" />} />
            <Route path="estoque" element={<EstoquePage />} />
            <Route path="estoque/importar-xml" element={<ImportarXmlPage />} />
            <Route path="fiados" element={<FiadosPage />} />
            <Route path="vasilhames" element={<VasilhamesPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="ajuda" element={<AjudaPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);