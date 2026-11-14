import { api } from './api';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'FIADO';
export type StatusVenda = 'CONCLUIDA' | 'ORCAMENTO' | 'CANCELADA';
export type StatusCaixa = 'ABERTO' | 'FECHADO';
export type TipoEntrega = 'RETIRADA_BALCAO' | 'DELIVERY';

export interface Produto {
  id: number;
  nome: string;
  codigoBarras: string | null;
  estoqueAtual: number;
  unidadeMedida: string;
  precoVendaVarejo: string | number;
  precoVendaAtacado: string | number | null;
  fardoQuantidade: number | null;
  ativo: boolean;
  lotes?: Array<{ id: number; numeroLote?: string | null; quantidade: number; dataVencimento?: string | null }>;
}

export interface Cliente {
  id: string;
  nome: string;
  saldoDevedor: string | number;
  limiteCredito: string | number;
  cascosEmPosse: number;
  ativo: boolean;
}

export interface Caixa {
  id: string;
  operadorId: string;
  status: StatusCaixa;
  saldoInicial: string | number;
  saldoFinalSistema?: string | number | null;
  abertoEm: string;
  fechadoEm?: string | null;
}

export interface ItemVendaEntrada {
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
  isFardo?: boolean;
}

export interface PagamentoVendaEntrada {
  formaPagamento: FormaPagamento;
  valor: number;
  troco?: number;
}

export interface NovaVenda {
  caixaId: string;
  funcionarioId: string;
  clienteId?: string;
  desconto?: number;
  taxaEntrega?: number;
  tipoEntrega?: TipoEntrega;
  enderecoEntrega?: string;
  cascosDevolvidos?: number;
  itens: ItemVendaEntrada[];
  pagamentos: PagamentoVendaEntrada[];
}

export interface Venda {
  id: string;
  codigoVenda: number;
  valorTotal: string | number;
  status: StatusVenda;
  criadoEm: string;
  caixaId: string;
  clienteId: string | null;
  itens: Array<{
    id: string;
    produtoId: number;
    quantidade: number;
    precoUnitario: string | number;
    precoTotal: string | number;
  }>;
  pagamentos: Array<{
    formaPagamento: FormaPagamento;
    valor: string | number;
    troco: string | number;
  }>;
}

export interface ComprovanteNaoFiscal {
  tipo: 'COMPROVANTE_NAO_FISCAL';
  titulo: 'COMPROVANTE NÃO FISCAL';
  aviso: string;
  loja: { nome: string; telefone: string | null; endereco: string | null };
  venda: {
    id: string; numero: number; realizadaEm: string; status: StatusVenda;
    operador: string; cliente: string | null;
  };
  itens: Array<{
    descricao: string; unidade: string; quantidade: number;
    precoUnitario: number; total: number;
  }>;
  valores: { subtotal: number; desconto: number; taxaEntrega: number; total: number };
  pagamentos: Array<{ forma: FormaPagamento; valor: number; troco: number }>;
}

export interface Dashboard {
  faturamentoHoje: number;
  totalVendasHoje: number;
  faturamentoMes: number;
  totalVendasMes: number;
  totalFiadoAReceber: number;
  totalClientesDevedores: number;
  topProdutosMaisVendidos: Array<{
    produto: Produto | null;
    quantidadeVendida: number;
    totalArrecadado: number;
  }>;
  caixasAtivos: Caixa[];
}

const obter = async <T>(url: string): Promise<T> =>
  (await api.get<T>(url)).data;

export const bebfy = {
  dashboard: () => obter<Dashboard>('/relatorios/dashboard'),
  produtos: {
    listar: () => obter<Produto[]>('/produtos'),
    buscar: (q: string) => api.get<Produto[]>('/produtos/buscar', { params: { q } }).then(r => r.data),
    codigoBarras: (codigo: string) => obter<Produto>(`/produtos/codigo-barras/${encodeURIComponent(codigo)}`),
    detalhe: (id: number) => obter<Produto>(`/produtos/${id}`),
  },
  clientes: {
    listar: () => obter<Cliente[]>('/clientes'),
    detalhe: (id: string) => obter<Cliente>(`/clientes/${encodeURIComponent(id)}`),
  },
  caixa: {
    listar: () => obter<Caixa[]>('/caixa'),
    abertoPorOperador: (id: string) =>
      obter<Caixa>(`/caixa/aberto/operador/${encodeURIComponent(id)}`),
    abrir: (dados: { operadorId: string; saldoInicial: number }) =>
      api.post<Caixa>('/caixa/abrir', dados).then(r => r.data),
    fechar: (id: string, saldoFinalFisico: number) =>
      api.patch<Caixa>(`/caixa/${encodeURIComponent(id)}/fechar`, { saldoFinalFisico }).then(r => r.data),
    extrato: (id: string) => obter<Record<string, unknown>>(`/caixa/${encodeURIComponent(id)}/extrato`),
  },
  vendas: {
    listar: () => obter<Venda[]>('/vendas'),
    detalhe: (id: string) => obter<Venda>(`/vendas/${encodeURIComponent(id)}`),
    registrar: (dados: NovaVenda) => api.post<Venda>('/vendas', dados).then(r => r.data),
    cancelar: (id: string) => api.post<Venda>(`/vendas/${encodeURIComponent(id)}/cancelar`).then(r => r.data),
    comprovante: (id: string) => obter<ComprovanteNaoFiscal>(
      `/vendas/${encodeURIComponent(id)}/comprovante`,
    ),
  },
};
