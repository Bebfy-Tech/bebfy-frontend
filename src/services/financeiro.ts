import { api } from './api';
import type { Base } from './cadastrosFinanceiros';
export type Dinheiro=number|string;
export type TipoConta='pagar'|'receber';
export type Baixa={id:string;principal:Dinheiro;juros:Dinheiro;multa:Dinheiro;desconto:Dinheiro;forma:Base|'NAO_INFORMADO';formaNome?:string|null;contaFinanceiraNome?:string|null;contaFinanceiraId?:string|null;operadorId?:string|null;observacao?:string|null;estornoDeId?:string|null;criadoEm:string};
export type Conta={id:string;descricao:string;categoria:string;categoriaCadastroId?:string|null;valor:Dinheiro;valorBaixado:Dinheiro;dataVencimento:string;status:'PENDENTE'|'PAGO'|'CANCELADO';observacao?:string|null;parcela?:number|null;totalParcelas?:number|null;fornecedor?:{id:string;razaoSocial:string}|null;cliente?:{id:string;nome:string;codigoCliente?:number}|null;baixas:Baixa[]};
export type Referencias={fornecedores:{id:string;razaoSocial:string}[];clientes:{id:string;nome:string;codigoCliente?:number}[];fiados:number|null;delivery:number|null};
export type Saldo={id:string;nome:string;ativo:boolean;tipoConta:string|null;saldoInicial:Dinheiro;saldo:Dinheiro};
export type Recebivel={id:string;fonte:'VENDA'|'FIADO';descricao:string;forma:string;formaBase:string;parcelas:number;bruto:Dinheiro;valorTaxa:Dinheiro|null;liquido:Dinheiro|null;conciliado:Dinheiro;saldo:Dinheiro;data:string;previsao:string|null;contaId:string|null;contaNome:string|null;operadora:string|null};
export type Movimento={id:string;tipo:'TRANSFERENCIA'|'CONCILIACAO';origemId:string|null;destinoId:string;origemNome:string|null;destinoNome:string;valor:Dinheiro;observacao:string;operadorId:string;estornoDeId:string|null;criadoEm:string;pagamentoVendaId:string|null;historicoFiadoId:string|null};
export type BaixaHistorico=Baixa&{contaPagarId:string|null;contaReceberId:string|null;contaPagar?:{descricao:string}|null;contaReceber?:{descricao:string}|null};
export type Historico={movimentos:Movimento[];baixas:BaixaHistorico[]};
export type Modalidade='UNICA'|'PARCELADA'|'RECORRENTE';
export type CriarConta={descricao:string;valor:number;dataVencimento:string;categoriaCadastroId:string;observacao?:string;fornecedorId?:string;clienteId?:string;modalidade:Modalidade;parcelas:number;chaveLancamento:string};
export type Baixar={principal:number;juros:number;multa:number;desconto:number;forma:Base;formaCadastroId:string;contaFinanceiraId?:string;observacao?:string;chaveOperacao:string};
const root='/financeiro';
const contaPath=(t:TipoConta,id:string)=>root+'/contas-'+t+'/'+encodeURIComponent(id);
export const financeiroApi={
 contas:(t:TipoConta)=>api.get<Conta[]>(root+'/contas-'+t).then(r=>r.data),
 referencias:()=>api.get<Referencias>(root+'/referencias').then(r=>r.data),
 saldos:()=>api.get<Saldo[]>(root+'/saldos').then(r=>r.data),
 recebiveis:()=>api.get<Recebivel[]>(root+'/recebiveis').then(r=>r.data),
 historico:()=>api.get<Historico>(root+'/historico').then(r=>r.data),
 criar:(t:TipoConta,d:CriarConta)=>api.post(root+'/contas-'+t,d),
 baixar:(t:TipoConta,id:string,d:Baixar)=>api.post(contaPath(t,id)+'/baixas',d),
 cancelar:(t:TipoConta,id:string)=>api.patch(contaPath(t,id)+'/cancelar'),
 estornarBaixa:(t:TipoConta,id:string,b:string,motivo:string)=>api.post(contaPath(t,id)+'/baixas/'+encodeURIComponent(b)+'/estorno',{motivo}),
 transferir:(d:{origemId:string;destinoId:string;valor:number;observacao:string;chaveOperacao:string})=>api.post(root+'/transferencias',d),
 conciliar:(d:{fonte:'VENDA'|'FIADO';fonteId:string;destinoId:string;valor:number;observacao:string;chaveOperacao:string})=>api.post(root+'/conciliacoes',d),
 estornarMovimento:(id:string,d:{motivo:string;chaveOperacao:string})=>api.post(root+'/movimentos/'+encodeURIComponent(id)+'/estorno',d)
};
// Use integer cents for aggregation and comparisons; amounts sent as decimal numbers.
export const centavos=(v:unknown)=>Math.round((Number(v)||0)*100);
export const restante=(c:Conta)=>c.status==='PENDENTE'?Math.max(0,centavos(c.valor)-centavos(c.valorBaixado)):0;
export const efetivo=(b:Baixa)=>centavos(b.principal)+centavos(b.juros)+centavos(b.multa)-centavos(b.desconto);
export const diaLocal=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const diaVencimento=(v:string)=>v.slice(0,10);
