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
  configuracaoCobrancaSaas?: {recorrente:boolean;diaVencimento:number}|null;
}
export interface SaasFinanceiroResumo {
  empresas: SaasFinanceiroEmpresa[];
  cobrancas: SaasCobrancaFinanceiro[];
}
export interface SaasAnexoFinanceiro {
  id:string; empresaId:number; cobrancaId:string|null; tipo:'BOLETO'|'COMPROVANTE';
  nome:string; mime:string; tamanho:number; operadorId:string; criadoEm:string;
}
export interface SaasFinanceiroEvento {
  id: string; empresaId: number; operadorId: string;
  acao: string; descricao: string; criadoEm: string;
}
export interface RegistrarPagamentoSaas {
  valor: number; pagoEm: string; forma: string; observacao?: string;
}

export type ChamadoStatus = 'PENDENTE'|'EM_ATENDIMENTO'|'AGUARDANDO_CLIENTE'|'COM_DEV'|'RESOLVIDO'|'CANCELADO';
export type ChamadoPrioridade = 'BAIXA'|'NORMAL'|'ALTA'|'URGENTE';
export type ChamadoCategoria = 'DUVIDA'|'ERRO'|'CONFIGURACAO'|'FINANCEIRO'|'SOLICITACAO'|'OUTRO';
export interface SaasChamadoAnexo {
  id:string;chamadoId:string;nome:string;mime:string;tamanho:number;operadorId:string;criadoEm:string;
}
export interface SaasChamadoEvento {
  id: string; chamadoId: string; operadorId: string; acao: string; mensagem: string; criadoEm: string;
}
export interface SaasChamado {
  id:string;numero:number;empresaId:number;titulo:string;descricao:string;
  contatoNome:string|null; contatoTelefone:string|null;
  categoria:ChamadoCategoria;prioridade:ChamadoPrioridade;status:ChamadoStatus;
  comDev:boolean;responsavelId:string|null;devResponsavel:string|null;
  solucao:string|null;abertoPorId:string;resolvidoEm:string|null;criadoEm:string;atualizadoEm:string;
  empresa:{id:number;nomeFantasia:string;slug:string};
  eventos?:SaasChamadoEvento[];
  _count?:{eventos:number};
}
export interface CriarSaasChamado {
  empresaId:number;titulo:string;descricao:string;contatoNome?:string;contatoTelefone?:string;
  categoria?:ChamadoCategoria;prioridade?:ChamadoPrioridade;responsavelId?:string;
}
export interface AtualizarSaasChamado {
  titulo?:string;descricao?:string;contatoNome?:string;contatoTelefone?:string;
  categoria?:ChamadoCategoria;prioridade?:ChamadoPrioridade;status?:ChamadoStatus;
  comDev?:boolean;responsavelId?:string;devResponsavel?:string;solucao?:string;
}
export interface SaasAuditEvent {
  id:string;operadorId:string;metodo:string;rota:string;campos:string[];recursoId:string|null;criadoEm:string;
}
export interface SaasTenantMonitor {
  id:number;nomeFantasia:string;slug:string;status:StatusEmpresa;
  inadimplente:boolean;criadoEm:string;
  _count:{funcionarios:number;produtos:number;vendas:number};
  usuariosAtivos:number;usuariosRecentes:number;ultimoAcesso:string|null;
}
export const saasApi = {
  auditoria: () => saasClient.get<SaasAuditEvent[]>('/saas/admin/auditoria').then(r=>r.data),
  monitoramento: () => saasClient.get<SaasTenantMonitor[]>('/saas/admin/monitoramento').then(r=>r.data),
  empresasSuporte: () => saasClient.get<Array<{id:number;nomeFantasia:string;slug:string;status:StatusEmpresa}>>('/saas/admin/suporte/empresas').then(r=>r.data),
  operadoresSuporte: () => saasClient.get<Array<{id:string;nome:string;codigo:number}>>('/saas/admin/suporte/operadores').then(r=>r.data),
  anexosChamado: (id:string) => saasClient.get<SaasChamadoAnexo[]>('/saas/admin/suporte/chamados/'+id+'/anexos').then(r=>r.data),
  anexarChamado: (id:string,file:File) => {
    const form=new FormData();form.append('arquivo',file);
    return saasClient.post<SaasChamadoAnexo>('/saas/admin/suporte/chamados/'+id+'/anexos',form,{headers:{'Content-Type':undefined}}).then(r=>r.data);
  },
  baixarAnexoChamado: (id:string,anexoId:string) => saasClient.get<Blob>('/saas/admin/suporte/chamados/'+id+'/anexos/'+anexoId,{responseType:'blob'}).then(r=>r.data),
  chamadosSuporte: () => saasClient.get<SaasChamado[]>('/saas/admin/suporte/chamados').then(r=>r.data),
  chamadoSuporte: (id:string) => saasClient.get<SaasChamado>('/saas/admin/suporte/chamados/'+id).then(r=>r.data),
  criarChamadoSuporte: (data:CriarSaasChamado) => saasClient.post<SaasChamado>('/saas/admin/suporte/chamados',data).then(r=>r.data),
  atualizarChamadoSuporte: (id:string,data:AtualizarSaasChamado) => saasClient.patch<SaasChamado>('/saas/admin/suporte/chamados/'+id,data).then(r=>r.data),
  registrarInteracaoSuporte: (id:string,mensagem:string) => saasClient.post<SaasChamadoEvento>('/saas/admin/suporte/chamados/'+id+'/interacoes',{mensagem}).then(r=>r.data),

  anexosFinanceiros: (id:number) => saasClient.get<SaasAnexoFinanceiro[]>(`/saas/admin/financeiro/empresas/${id}/anexos`).then(r=>r.data),
  anexarFinanceiro: (id:number,arquivo:File,tipo:'BOLETO'|'COMPROVANTE',cobrancaId?:string) => {
    const form=new FormData();form.append('arquivo',arquivo);form.append('tipo',tipo);
    if(cobrancaId)form.append('cobrancaId',cobrancaId);
    return saasClient.post<SaasAnexoFinanceiro>(`/saas/admin/financeiro/empresas/${id}/anexos`,form,{headers:{'Content-Type':undefined}}).then(r=>r.data);
  },
  baixarAnexoFinanceiro: (id:number,anexoId:string) => saasClient.get<Blob>(`/saas/admin/financeiro/empresas/${id}/anexos/${anexoId}`,{responseType:'blob'}).then(r=>r.data),
  configurarRecorrencia: (id:number,dados:{recorrente:boolean;diaVencimento:number}) => saasClient.patch('/saas/admin/financeiro/empresas/'+id+'/recorrencia',dados).then(r=>r.data),
  gerarMensalidades: (competencia:string) => saasClient.post<{competencia:string;geradas:number;ignoradas:number;elegiveis:number}>('/saas/admin/financeiro/gerar-mensalidades',{competencia}).then(r=>r.data),
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
