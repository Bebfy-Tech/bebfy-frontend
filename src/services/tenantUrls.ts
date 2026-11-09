/** Public URLs: /{loja} for login, /{loja}/{page} for operations. */
export const RESERVED_PATHS = [
  'saas', 'api', 'admin', 'login', 'logout', 'dashboard', 'pdv',
  'primeiro-acesso', 'produtos', 'clientes', 'funcionarios', 'categorias',
  'lotes', 'estoque', 'financeiro', 'caixas', 'vendas', 'delivery',
  'fiados', 'vasilhames', 'fornecedores', 'relatorios', 'configuracoes',
  'assets', 'static', 'www', 'health', 'favicon.ico', 'robots.txt',
];

const validSlug = (s:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) &&
  !RESERVED_PATHS.includes(s);

export const tenantFromPath = (pathname = window.location.pathname): string => {
  const first = decodeURIComponent(pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  return validSlug(first) ? first : '';
};

export const tenantPath = (path = '', slug = tenantFromPath()): string => {
  if (!slug || !validSlug(slug)) return '/';
  const suffix = path.replace(/^\/+/, '');
  return `/${slug}${suffix ? '/'+suffix : ''}`;
};

export const saasLoginPath = '/SaaS/admin';
export const saasPanelPath = '/SaaS/painel';
export const saasFirstAccessPath = '/SaaS/primeiro-acesso';
