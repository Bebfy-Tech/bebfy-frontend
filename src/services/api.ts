import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * The backend identifies each tenant by x-tenant during login.
 * Configure VITE_TENANT_SLUG per storefront; an existing session may also
 * resolve it from the authenticated company. Never send a numeric empresaId.
 */
export const getTenantSlug = (): string => {
  const override = localStorage.getItem('@Bebfy:tenantOverride');
  if (override && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(override)) return override;
  const configured = String(import.meta.env.VITE_TENANT_SLUG || '').trim().toLowerCase();
  if (configured) return configured;

  const baseDomain = String(import.meta.env.VITE_TENANT_BASE_DOMAIN || '').trim().toLowerCase();
  const host = window.location.hostname.toLowerCase();
  if (baseDomain && host.endsWith('.' + baseDomain)) {
    const slug = host.slice(0, -(baseDomain.length + 1));
    if (slug && !slug.includes('.') && !['api', 'app', 'www'].includes(slug)) {
      return slug;
    }
  }

  try {
    const stored = localStorage.getItem('@Bebfy:empresa');
    const company = stored ? JSON.parse(stored) as { subdominio?: string } : null;
    return company?.subdominio?.trim().toLowerCase() || '';
  } catch {
    return '';
  }
};

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const tenant = getTenantSlug();
  if (tenant) config.headers.set('x-tenant', tenant);

  const token = localStorage.getItem('@Bebfy:token');
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = String(error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem('@Bebfy:token');
      localStorage.removeItem('@Bebfy:user');
      localStorage.removeItem('@Bebfy:empresa');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);
