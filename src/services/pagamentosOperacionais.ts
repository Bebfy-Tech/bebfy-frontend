import { api } from './api';
import type { FormaPagamento } from './bebfy';
import type { Taxa } from './cadastrosFinanceiros';
export type FormaOperacional={id:string;nome:string;formaPagamento:FormaPagamento;maxParcelas:number;taxas:Taxa[]|null};
export const pagamentosOperacionais={
 pdv:()=>api.get<FormaOperacional[]>('/vendas/formas-pagamento').then(r=>r.data),
 fiado:()=>api.get<FormaOperacional[]>('/fiados/formas-pagamento').then(r=>r.data)
};
export const parcelasDisponiveis=(f:FormaOperacional|undefined)=>!f||f.formaPagamento!=='CARTAO_CREDITO'?[1]:[1,...Array.from(new Set((f.taxas??[]).map(t=>t.parcelas).filter(n=>Number.isInteger(n)&&n>1&&n<=f.maxParcelas))).sort((a,b)=>a-b)];
export const formaInicial=(f:FormaOperacional[])=>f.find(x=>x.formaPagamento==='DINHEIRO')??f[0];
