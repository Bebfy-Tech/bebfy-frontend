import React from 'react';
import { hasModule } from '../services/moduleAccess';
import type { NomeModulo } from '../services/saas';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { saasLoginPath, tenantPath } from '../services/tenantUrls';

export const PrivateRoute: React.FC<{saas?: boolean}> = ({saas=false}) => {
  const {isAuthenticated,loading,empresa}=useAuth();
  const saasSession=useSaasAuth();
  if(saas) {
    if(saasSession.loading) return <div className="grid min-h-screen place-items-center bg-[#091e24] text-white">Verificando acesso administrativo…</div>;
    return saasSession.user ? <Outlet /> : <Navigate to={saasLoginPath} replace />;
  }
  const {tenant}=useParams();
  if(loading){
    return <div className="grid min-h-screen place-items-center bg-[#091e24] text-white">
      <span role="status" className="animate-pulse text-sm font-semibold">Verificando acesso Bebfy...</span>
    </div>;
  }
  if(!isAuthenticated) return <Navigate to={saas?saasLoginPath:tenantPath('',tenant)} replace />;
  // Never expose a different tenant's navigation or records under the requested slug.
  if(!saas && tenant && empresa?.subdominio?.toLowerCase()!==tenant.toLowerCase()){
    return <Navigate to={tenantPath('',tenant)} replace />;
  }
  return <Outlet />;
};
/** Blocks deep links and bookmarks when SaaS disables a tenant feature. */
export const ModuleRoute: React.FC<{modulo: NomeModulo}> = ({modulo}) => {
  const { modules, modulesStatus, refreshModules } = useAuth();
  const { tenant } = useParams();
  if (modulesStatus === 'loading') {
    return <div role="status" className="rounded-2xl border border-white/10 p-8 text-sm text-slate-300">Verificando os módulos disponíveis...</div>;
  }
  if (modulesStatus === 'error') {
    return <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-8 text-slate-200">
      Não foi possível consultar os módulos liberados para esta distribuidora.
      <button type="button" className="ml-3 rounded-lg border border-white/20 px-3 py-2" onClick={()=>void refreshModules()}>Tentar novamente</button>
    </div>;
  }
  if (!hasModule(modules, modulo)) {
    return <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-8 text-slate-200">
      <h2 className="text-xl font-bold">Módulo não disponível</h2>
      <p className="mt-2 text-sm text-slate-400">Esta funcionalidade está desativada no plano da distribuidora. Entre em contato com o administrador.</p>
      <a className="mt-4 inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm" href={tenantPath('dashboard',tenant)}>Ir para o início</a>
    </div>;
  }
  return <Outlet />;
};
