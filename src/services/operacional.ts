import { api } from './api';

export type Linha = Record<string, unknown>;
export type Valores = Record<string, string | number | boolean | null>;
export type Recurso = 'produtos'|'categorias'|'lotes'|'fornecedores'|'clientes'|'funcionarios';
export type TipoCampo = 'text'|'number'|'date'|'email'|'tel'|'checkbox'|'select'|'textarea';
export type Campo = {
  key:string;label:string;type?:TipoCampo;required?:boolean;step?:string;
  options?:{value:string|number;label:string}[]; resource?:Recurso;placeholder?:string; span?:boolean;
};
export type Definicao = {
  endpoint: string;title:string;description:string;singular:string; fields:Campo[];
  columns:{key:string;label:string;format?:'money'|'date'|'boolean'|'category'|'stock'}[];
  canEdit?:boolean;canDelete?:boolean;managerOnly?:boolean;
};
export const definicoes: Record<Recurso,Definicao> = {
  produtos:{
    endpoint:'/produtos',title:'Produtos',singular:'produto',description:'Cadastre itens, preços, embalagens e estoque da distribuidora.',
    columns:[{key:'nome',label:'Produto'},{key:'codigoBarras',label:'Código'},{key:'categoria.nome',label:'Categoria'},{key:'precoVendaVarejo',label:'Varejo',format:'money'},{key:'estoqueAtual',label:'Estoque',format:'stock'},{key:'ativo',label:'Situação',format:'boolean'}],
    fields:[
      {key:'nome',label:'Nome do produto',required:true},{key:'codigoBarras',label:'Código de barras'},
      {key:'categoriaId',label:'Categoria',type:'select',resource:'categorias'},
      {key:'unidadeMedida',label:'Unidade',type:'select',options:[{value:'UN',label:'Unidade'},{value:'CX',label:'Caixa'},{value:'FARDO',label:'Fardo'},{value:'L',label:'Litro'}]},
      {key:'ml',label:'Volume (ml)',type:'number'},{key:'fardoQuantidade',label:'Unidades por fardo',type:'number'},
      {key:'precoCusto',label:'Preço de custo (R$)',type:'number',step:'0.01'},
      {key:'precoVendaVarejo',label:'Preço de varejo (R$)',type:'number',step:'0.01',required:true},
      {key:'precoVendaAtacado',label:'Preço de atacado (R$)',type:'number',step:'0.01'},
      {key:'qtdAtacadoMinima',label:'Quantidade mínima atacado',type:'number'},
      {key:'estoqueAtual',label:'Estoque inicial',type:'number'},
      {key:'estoqueMinimo',label:'Estoque mínimo',type:'number'},
      {key:'retornavel',label:'Produto retornável (vasilhame)',type:'checkbox'},
    ],canEdit:true,canDelete:true,
  },
  categorias:{
    endpoint:'/categorias',title:'Categorias',singular:'categoria',description:'Organize cervejas, refrigerantes, águas e demais produtos.',
    columns:[{key:'nome',label:'Categoria'},{key:'descricao',label:'Descrição'}],
    fields:[{key:'nome',label:'Nome',required:true},{key:'descricao',label:'Descrição',type:'textarea',span:true}],
    canEdit:true,canDelete:true,
  },
  lotes:{
    endpoint:'/lotes',title:'Lotes e validade',singular:'lote',description:'Registre os lotes recebidos, quantidades e datas de validade.',
    columns:[{key:'produto.nome',label:'Produto'},{key:'numeroLote',label:'Lote'},{key:'quantidade',label:'Quantidade'},{key:'dataVencimento',label:'Validade',format:'date'}],
    fields:[{key:'produtoId',label:'Produto',type:'select',resource:'produtos',required:true},{key:'numeroLote',label:'Número do lote'},{key:'quantidade',label:'Quantidade recebida',type:'number',required:true},{key:'dataVencimento',label:'Data de vencimento',type:'date'}],
    canDelete:true,
  },
  fornecedores:{
    endpoint:'/fornecedores',title:'Fornecedores',singular:'fornecedor',description:'Mantenha contatos e dados comerciais de seus fornecedores.',
    columns:[{key:'razaoSocial',label:'Razão social'},{key:'nomeFantasia',label:'Fantasia'},{key:'cnpj',label:'CNPJ'},{key:'telefone',label:'Telefone'}],
    fields:[{key:'razaoSocial',label:'Razão social',required:true},{key:'nomeFantasia',label:'Nome fantasia'},{key:'cnpj',label:'CNPJ',required:true},{key:'inscricaoEstadual',label:'Inscrição estadual'},{key:'telefone',label:'Telefone',type:'tel'},{key:'email',label:'E-mail',type:'email'},{key:'endereco',label:'Endereço',span:true}],
    canEdit:true,canDelete:true,
  },
  clientes:{
    endpoint:'/clientes',title:'Clientes',singular:'cliente',description:'Clientes, contatos, limite de crédito e saldos de fiado.',
    columns:[{key:'nome',label:'Cliente'},{key:'cpfCnpj',label:'CPF/CNPJ'},{key:'telefone',label:'Telefone'},{key:'limiteCredito',label:'Limite',format:'money'},{key:'saldoDevedor',label:'Saldo devedor',format:'money'}],
    fields:[{key:'nome',label:'Nome / razão social',required:true},{key:'cpfCnpj',label:'CPF ou CNPJ'},{key:'telefone',label:'Telefone',type:'tel'},{key:'endereco',label:'Endereço',span:true},{key:'limiteCredito',label:'Limite de crédito (R$)',type:'number',step:'0.01'}],
    canEdit:true,canDelete:true,
  },
  funcionarios:{
    endpoint:'/funcionarios',title:'Funcionários',singular:'funcionário',description:'Cadastre colaboradores e configure credenciais e permissões.',
    columns:[{key:'nome',label:'Nome'},{key:'codigo',label:'Código'},{key:'cargo',label:'Cargo'},{key:'cpf',label:'CPF'},{key:'ativo',label:'Ativo',format:'boolean'}],
    fields:[{key:'nome',label:'Nome completo',required:true},{key:'cpf',label:'CPF',required:true},{key:'telefone',label:'Telefone',type:'tel'},
      {key:'cargo',label:'Cargo',type:'select',required:true,options:[
        {value:'PROPRIETARIO',label:'Proprietário'},{value:'ADMINISTRADOR',label:'Administrador'},
        {value:'GERENTE',label:'Gerente'},{value:'OPERADOR_CAIXA',label:'Operador de caixa'},
        {value:'ESTOQUISTA',label:'Estoquista'},{value:'ENTREGADOR',label:'Entregador'},{value:'FUNCIONARIO',label:'Funcionário'},
      ]},
      {key:'descontoMaximo',label:'Desconto máximo (%)',type:'number',step:'0.01'},
      {key:'ativo',label:'Funcionário ativo',type:'checkbox'},
    ],canEdit:true,canDelete:true,managerOnly:true,
  },
};

export const recursoApi = {
  listar: async (endpoint:string):Promise<Linha[]> => (await api.get<Linha[]>(endpoint)).data,
  detalhe: async (endpoint:string,id:string|number):Promise<Linha> => (await api.get<Linha>(endpoint+'/'+encodeURIComponent(String(id)))).data,
  criar: async (endpoint:string,dados:Valores):Promise<Linha> => (await api.post<Linha>(endpoint,dados)).data,
  editar: async (endpoint:string,id:string|number,dados:Valores):Promise<Linha> => (await api.patch<Linha>(endpoint+'/'+encodeURIComponent(String(id)),dados)).data,
  excluir: async (endpoint:string,id:string|number):Promise<unknown> => (await api.delete(endpoint+'/'+encodeURIComponent(String(id)))).data,
};
export function valor(obj:Linha,key:string):unknown{
  return key.split('.').reduce<unknown>((acc,k)=>{
    if(!acc||typeof acc!=='object')return undefined;
    return (acc as Record<string,unknown>)[k];
  },obj);
}
export function montarDados(campos:Campo[],estado:Valores,editing=false):Valores{
  const dados:Valores={};
  for(const campo of campos){
    if(editing && (campo.key==='estoqueAtual'||campo.key==='ativo') && campo.key==='estoqueAtual')continue;
    const v=estado[campo.key];
    if(v===undefined||v===null||v==='')continue;
    dados[campo.key]=campo.type==='number'||(campo.type==='select'&&campo.resource==='produtos')?Number(v):campo.type==='checkbox'?Boolean(v):v;
  }
  return dados;
}
