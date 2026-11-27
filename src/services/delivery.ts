import { api } from './api';
import type { Venda } from './bebfy';
export type SituacaoEntrega='PENDENTE'|'SEPARANDO'|'SAIU_PARA_ENTREGA'|'ENTREGUE'|'NAO_ENTREGUE';
export type Entregador={id:string;nome:string;codigo?:number|null;telefone?:string|null;ativo?:boolean};
export type Entrega=Omit<Venda,'cliente'|'itens'>&{
 cliente?:{id:string;nome:string;codigoCliente?:number;telefone?:string|null}|null;
 itens:(Omit<Venda['itens'][number],'produto'>&{produto?:{id:number;nome:string}|null})[];
 statusEntrega:SituacaoEntrega|null;statusAcerto:'PENDENTE'|'CONCLUIDO';entregadorId?:string|null;entregador?:Entregador|null;
 saidaEntregaEm?:string|null;entregueEm?:string|null;acertoEm?:string|null;acertoOperadorId?:string|null;
 historicoEntrega:{id:string;status:SituacaoEntrega;entregadorId?:string|null;operadorId?:string|null;observacao?:string|null;criadoEm:string}[];
};
export const situacoes:Record<SituacaoEntrega,string>={PENDENTE:'Aguardando separação',SEPARANDO:'Separando',SAIU_PARA_ENTREGA:'Em rota',ENTREGUE:'Entregue',NAO_ENTREGUE:'Não entregue'};
export const formas={DINHEIRO:'Dinheiro',PIX:'PIX',CARTAO_DEBITO:'Cartão de débito',CARTAO_CREDITO:'Cartão de crédito',FIADO:'Fiado'} as const;
export const situacao=(v:Entrega)=>v.status==='CANCELADA'?'Cancelada':v.statusEntrega?situacoes[v.statusEntrega]:'Sem registro';
export const elegivel=(v:Entrega)=>v.status==='CONCLUIDA'&&v.statusEntrega==='ENTREGUE'&&v.statusAcerto==='PENDENTE'&&!!v.entregadorId;
export function proxima(v:Entrega):SituacaoEntrega[]{
 if(v.status!=='CONCLUIDA'||v.statusAcerto!=='PENDENTE')return [];
 const etapas:Record<string,SituacaoEntrega[]>={LEGADO:['PENDENTE','ENTREGUE'],PENDENTE:['SEPARANDO'],SEPARANDO:['SAIU_PARA_ENTREGA','PENDENTE'],SAIU_PARA_ENTREGA:['ENTREGUE','NAO_ENTREGUE'],NAO_ENTREGUE:['SEPARANDO'],ENTREGUE:[]};
 return etapas[v.statusEntrega??'LEGADO']??[];
}
export function resumo(vendas:Entrega[]){
 const r:Record<keyof typeof formas,number>={DINHEIRO:0,PIX:0,CARTAO_DEBITO:0,CARTAO_CREDITO:0,FIADO:0};
 for(const v of vendas)for(const p of v.pagamentos)if(p.formaPagamento in r)r[p.formaPagamento]+=Math.round(Number(p.valor)*100)-Math.round(Number(p.troco??0)*100);
 return r;
}
export const deliveryApi={
 listar:()=>api.get<{vendas:Entrega[];entregadores:Entregador[]}>('/vendas/delivery').then(r=>r.data),
 atualizar:(id:string,dados:{status:SituacaoEntrega;entregadorId?:string;observacao?:string})=>api.patch('/vendas/'+encodeURIComponent(id)+'/entrega',dados),
 acertar:(vendaIds:string[],dinheiroConferido:number)=>api.post('/vendas/confirmar-acerto-delivery',{vendaIds,dinheiroConferido})
};
