// Expiration values are calendar dates. Do not shift midnight UTC into the previous day.
export const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const dateOnly=(v:unknown)=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—';
export type LotStatus='normal'|'avencer'|'vencido'|'esgotado'|'sem-data';
export const lotStatus=(l:{quantidade?:unknown;dataVencimento?:unknown}):LotStatus=>{
 if(Number(l.quantidade)<=0)return 'esgotado';
 if(!l.dataVencimento)return 'sem-data';
 const now=new Date(),limit=new Date(now);limit.setDate(limit.getDate()+30);
 const date=String(l.dataVencimento).slice(0,10);
 return date<dateKey(now)?'vencido':date<=dateKey(limit)?'avencer':'normal';
};
export const lotLabels:Record<LotStatus,string>={normal:'Normal',avencer:'A vencer',vencido:'Vencido',esgotado:'Esgotado','sem-data':'Sem validade'};
