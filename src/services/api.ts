import axios from 'axios';
import { tenantFromPath, tenantPath, saasLoginPath } from './tenantUrls';

const baseURL=import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Tenant belongs to the URL, never to a user-selectable numeric ID. */
export const getTenantSlug=():string=>{
  const pathSlug=tenantFromPath();
  if(pathSlug) return pathSlug;
  // SaaS administration authenticates an allow-listed administrator
  // through their own home-tenant; protected by the SaaS server-side guard.
  if(window.location.pathname.toLowerCase().startsWith('/saas/')){
    const override=localStorage.getItem('@Bebfy:tenantOverride')||'';
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(override)?override:'';
  }
  const configured=String(import.meta.env.VITE_TENANT_SLUG||'').trim().toLowerCase();
  if(configured) return configured;
  const baseDomain=String(import.meta.env.VITE_TENANT_BASE_DOMAIN||'').trim().toLowerCase();
  const host=window.location.hostname.toLowerCase();
  if(baseDomain && host.endsWith('.'+baseDomain)){
    const slug=host.slice(0,-(baseDomain.length+1));
    if(slug && !slug.includes('.') && !['api','app','www'].includes(slug))return slug;
  }
  return '';
};

export const api=axios.create({
  baseURL,timeout:20000,headers:{'Content-Type':'application/json'},
});

api.interceptors.request.use(config=>{
  const tenant=getTenantSlug();
  if(tenant)config.headers.set('x-tenant',tenant);
  const token=localStorage.getItem('@Bebfy:token');
  if(token&&!config.headers.has('Authorization')){
    config.headers.set('Authorization',`Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(response=>response,error=>{
  const url=String(error.config?.url||'');
  const isCredentialCheck=[
    '/auth/login','/auth/primeiro-acesso/alterar-senha','/auth/validar-gerente',
  ].some(endpoint=>url.includes(endpoint));
  if(error.response?.status===401&&!isCredentialCheck){
    localStorage.removeItem('@Bebfy:token');
    localStorage.removeItem('@Bebfy:user');
    localStorage.removeItem('@Bebfy:empresa');
    const pathname=window.location.pathname;
    const destination=pathname.toLowerCase().startsWith('/saas/')
      ? saasLoginPath : tenantPath('',tenantFromPath(pathname));
    if(pathname!==destination)window.location.replace(destination);
  }
  return Promise.reject(error);
});