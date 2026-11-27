import { api } from './api';
export const grupos={FORMA_PAGAMENTO:'Formas de pagamento',CUSTO_FIXO:'Custos fixos',CUSTO_VARIAVEL:'Custos variáveis',RECEITA:'Receitas',BANCO:'Bancos',CONTA:'Contas financeiras',OPERADORA:'Operadoras'} as const;
export type Grupo=keyof typeof grupos;
export const bases={DINHEIRO:'Dinheiro',PIX:'PIX',CARTAO_CREDITO:'Cartão de crédito',CARTAO_DEBITO:'Cartão de débito',BOLETO:'Boleto',TRANSFERENCIA:'Transferência',OUTROS:'Outros'} as const;
export type Base=keyof typeof bases;
export const tiposConta={CORRENTE:'Conta corrente',POUPANCA:'Poupança',DIGITAL:'Conta digital',CAIXA_FISICO:'Caixa físico'} as const;
export type Taxa={parcelas:number;taxa:number;prazoDias:number};
export type Cadastro={id:string;tipo:Grupo;nome:string;ativo:boolean;formaBase:Base|null;fiado:boolean;permitePagar:boolean;permiteReceber:boolean;permitePdv:boolean;maxParcelas:number;taxas:Taxa[]|null;bancoId:string|null;contaId:string|null;operadoraId:string|null;agencia:string|null;numeroConta:string|null;tipoConta:keyof typeof tiposConta|null;chavePix:string|null;saldoInicial:string|number;criadoEm:string;atualizadoEm:string};
export type Draft=Omit<Cadastro,'id'|'criadoEm'|'atualizadoEm'|'saldoInicial'>&{saldoInicial:number};
export type Auditoria={id:string;cadastroId:string;operadorId:string|null;acao:string;antes:Record<string,unknown>|null;depois:Record<string,unknown>|null;criadoEm:string};
const root='/financeiro/cadastros';
export const cadastrosApi={
 listar:()=>api.get<Cadastro[]>(root).then(r=>r.data),
 auditoria:()=>api.get<Auditoria[]>(root+'/auditoria').then(r=>r.data),
 criar:(dados:Draft)=>api.post(root,dados),
 editar:(id:string,dados:Draft)=>api.patch(root+'/'+encodeURIComponent(id),dados),
 situacao:(id:string,ativo:boolean)=>api.patch(root+'/'+encodeURIComponent(id)+'/situacao',{ativo}),
 excluir:(id:string)=>api.delete(root+'/'+encodeURIComponent(id))
};
export function novoCadastro(tipo:Grupo):Draft{return {tipo,nome:'',ativo:true,formaBase:tipo==='FORMA_PAGAMENTO'?'PIX':null,fiado:false,permitePagar:tipo==='FORMA_PAGAMENTO',permiteReceber:tipo==='FORMA_PAGAMENTO',permitePdv:tipo==='FORMA_PAGAMENTO',maxParcelas:1,taxas:[],bancoId:null,contaId:null,operadoraId:null,agencia:null,numeroConta:null,tipoConta:tipo==='CONTA'?'CORRENTE':null,chavePix:null,saldoInicial:0};}
