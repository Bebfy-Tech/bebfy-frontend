import { saasClient } from './saasAuth';

export type TipoPlanoSaas = 'VAREJO_BASICO' | 'VAREJO_PRO' | 'ATACADO_FULL' | 'PERSONALIZADO';
export interface PlanoEntrada { nome: string; tipo: TipoPlanoSaas; precoMensal: number; modulosPadrao?: NomeModulo[]; }

export type StatusEmpresa = 'ATIVA' | 'EM_TESTE' | 'SUSPENSA' | 'CANCELADA';
export type NomeModulo = 'CAIXA_PDV' | 'FIADOS' | 'VASILHAMES_RETORNAVEIS' | 'ENTREGAS_DELIVERY' | 'PEDIDOS_ATACADO' | 'TABELA_PRECO_VOLUME' | 'ROTAS_CAMINHOES' | 'CREDITO_B2B' | 'ESTOQUE_LOTES' | 'COMPRAS_FORNECEDORES' | 'RELATORIOS_AVANCADOS';

export const MODULOS: { key: NomeModulo; nome: string; descricao: string }[] = [
  { key: 'CAIXA_PDV', nome: 'Frente de caixa e PDV', descricao: 'Vendas, recebimentos e operação de caixa' },
  { key: 'FIADOS', nome: 'Fiados', descricao: 'Controle de crédito e histórico dos clientes' },
  { key: 'VASILHAMES_RETORNAVEIS', nome: 'Vasilhames retornáveis', descricao: 'Empréstimos e devoluções de cascos' },
  { key: 'ENTREGAS_DELIVERY', nome: 'Entregas e delivery', descricao: 'Pedidos e acerto de entregadores' },
  { key: 'PEDIDOS_ATACADO', nome: 'Pedidos de atacado', descricao: 'Operações de venda por volume' },
  { key: 'TABELA_PRECO_VOLUME', nome: 'Preços por volume', descricao: 'Tabela diferenciada por quantidade' },
  { key: 'ROTAS_CAMINHOES', nome: 'Rotas e caminhões', descricao: 'Organização de rotas operacionais' },
  { key: 'CREDITO_B2B', nome: 'Crédito entre empresas', descricao: 'Controle comercial B2B' },
  { key: 'ESTOQUE_LOTES', nome: 'Estoque e lotes', descricao: 'Rastreabilidade e validade de estoque' },
  { key: 'COMPRAS_FORNECEDORES', nome: 'Compras e fornecedores', descricao: 'Gestão de abastecimento e compras' },
  { key: 'RELATORIOS_AVANCADOS', nome: 'Relatórios avançados', descricao: 'Análises e acompanhamento do negócio' },
];

export interface PlanoSaas {
  id: number;
  nome: string;
  tipo: TipoPlanoSaas;
  precoMensal: string | number;
  criadoEm: string;
  modulosPadrao?: NomeModulo[];
}
export interface ModuloEmpresa {
  id: number;
  empresaId: number;
  modulo: NomeModulo;
  ativo: boolean;
}
export interface EmpresaSaas {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  slug: string;
  subdominio: string | null;
  status: StatusEmpresa;
  inadimplente: boolean;
  liberacaoFinanceiraAte: string | null;
  historicoLiberacoes?: Array<{ id: string; operadorId: string; dias: number; motivo: string; liberadoAte: string; criadoEm: string }>;
  planoId: number | null;
  plano: PlanoSaas | null;
  modulosAtivos: ModuloEmpresa[];
  criadoEm: string;
  _count: {
    funcionarios: number;
    produtos: number;
    vendas: number;
    clientes?: number;
  };
  funcionarios?: Array<{
    id: string; codigo: number | null; nome: string; cpf: string; telefone: string | null;
    usuario?: { email: string; ativo: boolean } | null;
  }>;
  config?: {
    nomeEmpresa: string;
    telefone: string | null;
    endereco: string | null;
  } | null;
}
export interface CriarEmpresaSaas {
  nome: string;
  documento: string;
  subdominio: string;
  email: string;
  telefone: string;
  planoId: number;
  nomeResponsavel: string;
  cpfResponsavel: string;
  senhaInicial: string;
}

export interface SaasCobranca {
  id:string;empresaId:number;referencia:string;valor:number|string;vencimento:string;
  pagoEm:string|null;linhaDigitavel:string|null;observacao:string|null;criadoEm:string;
}
export interface CriarSaasCobranca {referencia:string;valor:number;vencimento:string;linhaDigitavel?:string;observacao?:string;}
export interface SaasModuloDescricao { modulo: NomeModulo; nome: string; descricao: string; atualizadoEm: string }
export interface AtualizarEmpresaSaas {
  nomeFantasia?: string; razaoSocial?: string; documento?: string; telefone?: string;
  nomeResponsavel?: string; cpfResponsavel?: string; emailResponsavel?: string; senhaTemporaria?: string;
}


export interface SaasPagamento {
  id: string; cobrancaId: string; valor: number; pagoEm: string;
  forma: string; observacao: string | null; operadorId: string; criadoEm: string;
}
export interface SaasCobrancaFinanceiro extends SaasCobranca {
  recebido: number; saldo: number;
  status: 'PAGO' | 'VENCIDO' | 'PENDENTE' | 'PARCIAL';
  pagamentos: SaasPagamento[];
}
export interface SaasFinanceiroEmpresa {
  id: number; nomeFantasia: string; slug: string; status: StatusEmpresa;
  inadimplente: boolean; liberacaoFinanceiraAte: string | null;
  plano: {nome: string; precoMensal: number|string} | null;
}
export interface SaasFinanceiroResumo {
  empresas: SaasFinanceiroEmpresa[];
  cobrancas: SaasCobrancaFinanceiro[];
}
export interface SaasFinanceiroEvento {
  id: string; empresaId: number; operadorId: string;
  acao: string; descricao: string; criadoEm: string;
}
export interface RegistrarPagamentoSaas {
  valor: number; pagoEm: string; forma: string; observacao?: string;
}

export const saasApi = {
  financeiro: () => saasClient.get<SaasFinanceiroResumo>('/saas/admin/financeiro').then(r=>r.data),
  historicoFinanceiro: (id:number) => saasClient.get<SaasFinanceiroEvento[]>(`/saas/admin/financeiro/empresas/${id}/historico`).then(r=>r.data),
  registrarPagamento: (id:number,cobrancaId:string,dados:RegistrarPagamentoSaas) => saasClient.post<SaasPagamento>(`/saas/admin/financeiro/empresas/${id}/cobrancas/${cobrancaId}/pagamentos`,dados).then(r=>r.data),
  cobrancas: (id:number) => saasClient.get<SaasCobranca[]>('/saas/admin/empresas/'+id+'/cobrancas').then(r=>r.data),
  criarCobranca: (id:number,dados:CriarSaasCobranca) => saasClient.post<SaasCobranca>('/saas/admin/empresas/'+id+'/cobrancas',dados).then(r=>r.data),
  marcarPagamento: (id:number,cobrancaId:string,pago:boolean) => saasClient.patch<SaasCobranca>('/saas/admin/empresas/'+id+'/cobrancas/'+cobrancaId+'/pagamento',{pago}).then(r=>r.data),
  descricoesModulos: () => saasClient.get<SaasModuloDescricao[]>('/saas/admin/modulos').then(r=>r.data),
  personalizarModulo: (modulo: NomeModulo, dados: {nome:string;descricao:string}) => saasClient.patch<SaasModuloDescricao>('/saas/admin/modulos/'+modulo,dados).then(r=>r.data),
  empresas: () => saasClient.get<EmpresaSaas[]>('/saas/admin/empresas').then(r => r.data),
  empresa: (id: number) => saasClient.get<EmpresaSaas>(`/saas/admin/empresas/${id}`).then(r => r.data),
  planos: () => saasClient.get<PlanoSaas[]>('/saas/admin/planos').then(r => r.data),
  criarPlano: (dados: PlanoEntrada) => saasClient.post<PlanoSaas>('/saas/admin/planos', dados).then(r => r.data),
  editarPlano: (id: number, dados: PlanoEntrada) => saasClient.patch<PlanoSaas>(`/saas/admin/planos/${id}`, dados).then(r => r.data),
  editarEmpresa: (id: number, dados: AtualizarEmpresaSaas) =>
    saasClient.patch<EmpresaSaas>(`/saas/admin/empresas/${id}`, dados).then(r => r.data),
  criarEmpresa: (dados: CriarEmpresaSaas) => saasClient.post('/saas/admin/empresas', dados).then(r => r.data),
  definirInadimplencia: (id: number, inadimplente: boolean) =>
    saasClient.patch<EmpresaSaas>(`/saas/admin/empresas/${id}/inadimplencia`, { inadimplente }).then(r => r.data),
  liberarTemporariamente: (id: number, dias: number, motivo: string) =>
    saasClient.post<EmpresaSaas>(`/saas/admin/empresas/${id}/liberar-acesso`, { dias, motivo }).then(r => r.data),
  alterarStatus: (id: number, status: StatusEmpresa) =>
    saasClient.patch<EmpresaSaas>(`/saas/admin/empresas/${id}/status`, { status }).then(r => r.data),
  alterarPlano: (id: number, planoId: number) =>
    saasClient.patch<EmpresaSaas>(`/saas/admin/empresas/${id}/plano`, { planoId }).then(r => r.data),
  alternarModulo: (id: number, modulo: NomeModulo, ativo: boolean) =>
    saasClient.patch<ModuloEmpresa>(`/saas/admin/empresas/${id}/modulos`, { modulo, ativo }).then(r => r.data),
};
