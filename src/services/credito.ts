import type { Cliente, ModalidadeCredito } from './bebfy';

/** Fail closed when an older API does not report an explicit policy. */
export const modalidade=(c?:Cliente|null):ModalidadeCredito=>c?.modalidadeCredito==='LIMITADO'||c?.modalidadeCredito==='ILIMITADO'?c.modalidadeCredito:'BLOQUEADO';
export const creditoDisponivel=(c?:Cliente|null):number=>{
 if(!c?.ativo)return 0;
 if(modalidade(c)==='ILIMITADO')return Infinity;
 if(modalidade(c)==='BLOQUEADO')return 0;
 return Math.max(0,Math.round((Number(c.limiteCredito)-Number(c.saldoDevedor))*100)/100)||0;
};
export const rotuloCredito=(c?:Cliente|null)=>({BLOQUEADO:'Fiado bloqueado',LIMITADO:'Crédito limitado',ILIMITADO:'Crédito ilimitado'}[modalidade(c)]);
export function erroCredito(c:Cliente|undefined|null,valor:number):string|null{
 if(!c?.ativo)return 'Selecione um cliente ativo para vender ou lançar fiado.';
 if(modalidade(c)==='BLOQUEADO')return 'Fiado bloqueado para este cliente.';
 if(!Number.isFinite(valor)||valor<=0)return 'Informe um valor positivo de fiado.';
 if(Math.round(valor*100)>Math.round(creditoDisponivel(c)*100))return 'O valor no fiado ultrapassa o crédito disponível.';
 return null;
}
