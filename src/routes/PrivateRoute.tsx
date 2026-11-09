import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saasLoginPath, tenantPath } from '../services/tenantUrls';

export const PrivateRoute: React.FC<{saas?: boolean}> = ({saas=false}) => {
  const {isAuthenticated,loading,empresa}=useAuth();
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