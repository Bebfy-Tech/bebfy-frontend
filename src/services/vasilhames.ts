import { api } from './api';
export interface TipoVasilhame {id:number;nome:string}
export interface SaldoVasilhame extends TipoVasilhame {quantidade:number}
export interface MovimentoCasco {id:string;clienteId:string;cliente?:{id:string;nome:string;codigoCliente?:number};tipoVasilhameId:number|null;tipoVasilhame?:TipoVasilhame|null;produto?:{id:number;nome:string}|null;quantidade:number;origem:string;observacao?:string|null;criadoEm:string;vendaId?:string|null}
export interface ExtratoCasco {cliente:{id:string;nome:string;codigoCliente?:number;cascosEmPosse:number;ativo:boolean};historico:MovimentoCasco[];saldos:SaldoVasilhame[];legado:number}
export const rotulosCasco:Record<string,string>={LEGADO:'Histórico anterior',EMPRESTIMO_SAIDA:'Empréstimo',DEVOLUCAO_ENTRADA:'Devolução',QUEBRA_AVARIA:'Quebra / avaria',CLASSIFICACAO:'Classificação de saldo antigo',VENDA:'Empréstimo no PDV',DEVOLUCAO_PDV:'Devolução no PDV',ESTORNO:'Estorno'};
export const vasilhamesApi={
 tipos:()=>api.get<TipoVasilhame[]>('/produtos/vasilhames/tipos').then(r=>r.data),
 historico:()=>api.get<MovimentoCasco[]>('/produtos/vasilhames/historico').then(r=>r.data),
 extrato:(id:string)=>api.get<ExtratoCasco>('/produtos/vasilhames/cliente/'+encodeURIComponent(id)+'/extrato').then(r=>r.data),
};
