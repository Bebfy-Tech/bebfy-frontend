import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { PrivateRoute, ModuleRoute } from './PrivateRoute';
import { validSlug } from '../services/tenantUrls';
import { AppShell } from '../components/AppShell';
import { LandingPage } from '../pages/LandingPage';
import { StoreLookup } from '../pages/StoreLookup';
import { Login } from '../pages/Login';
import { FirstAccess } from '../pages/FirstAccess';
import { RecuperarSenha } from '../pages/RecuperarSenha';
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
        <Route path="recuperar-senha" element={<RecuperarSenha />} />
        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route element={<ModuleRoute modulo="CAIXA_PDV" />}><Route path="pdv" element={<PDV />} /></Route>
            <Route element={<ModuleRoute modulo="CAIXA_PDV" />}><Route path="vendas" element={<VendasPage />} /></Route>
            <Route element={<ModuleRoute modulo="CAIXA_PDV" />}><Route path="caixas" element={<CaixasPage />} /></Route>
            <Route element={<ModuleRoute modulo="ENTREGAS_DELIVERY" />}><Route path="delivery" element={<DeliveryPage />} /></Route>
            <Route path="produtos" element={<CadastroPage resource="produtos" />} />
            <Route path="categorias" element={<CadastroPage resource="categorias" />} />
            <Route element={<ModuleRoute modulo="ESTOQUE_LOTES" />}><Route path="lotes" element={<CadastroPage resource="lotes" />} /></Route>
            <Route element={<ModuleRoute modulo="COMPRAS_FORNECEDORES" />}><Route path="fornecedores" element={<CadastroPage resource="fornecedores" />} /></Route>
            <Route path="clientes" element={<CadastroPage resource="clientes" />} />
            <Route path="funcionarios" element={<CadastroPage resource="funcionarios" />} />
            <Route path="estoque" element={<EstoquePage />} />
            <Route element={<ModuleRoute modulo="COMPRAS_FORNECEDORES" />}><Route path="estoque/importar-xml" element={<ImportarXmlPage />} /></Route>
            <Route element={<ModuleRoute modulo="FIADOS" />}><Route path="fiados" element={<FiadosPage />} /></Route>
            <Route element={<ModuleRoute modulo="VASILHAMES_RETORNAVEIS" />}><Route path="vasilhames" element={<VasilhamesPage />} /></Route>
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route element={<ModuleRoute modulo="RELATORIOS_AVANCADOS" />}><Route path="relatorios" element={<RelatoriosPage />} /></Route>
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="ajuda" element={<AjudaPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);