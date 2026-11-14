import type { NomeModulo } from './saas';

/**
 * A route is hidden only when its module was explicitly disabled.
 * Legacy module configurations without an EmpresaModulo record remain enabled,
 * exactly like ModuloAtivoGuard on the backend.
 */
export type TenantModules = Partial<Record<NomeModulo, boolean>>;

export const routeModules: Record<string, NomeModulo> = {
  '/pdv': 'CAIXA_PDV',
  '/vendas': 'CAIXA_PDV',
  '/caixas': 'CAIXA_PDV',
  '/delivery': 'ENTREGAS_DELIVERY',
  '/lotes': 'ESTOQUE_LOTES',
  '/estoque/importar-xml': 'COMPRAS_FORNECEDORES',
  '/fornecedores': 'COMPRAS_FORNECEDORES',
  '/fiados': 'FIADOS',
  '/vasilhames': 'VASILHAMES_RETORNAVEIS',
  '/relatorios': 'RELATORIOS_AVANCADOS',
};

export const hasModule = (modules: TenantModules, required?: NomeModulo) =>
  !required || modules[required] !== false;
