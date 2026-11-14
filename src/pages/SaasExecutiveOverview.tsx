import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChartNoAxesCombined, CircleCheckBig, Headset, ShieldAlert, Wallet } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasChamado, SaasFinanceiroResumo } from '../services/saas';

const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const card='rounded-2xl border border-white/10 bg-[#162b2d] p-5';

export function SaasExecutiveOverview({
  canFinance,canSupport,onFinance,onSupport,
}:{
  canFinance:boolean;canSupport:boolean;onFinance:()=>void;onSupport:()=>void;
}){
  const [finance,setFinance]=useState<SaasFinanceiroResumo|null>(null);
  const [tickets,setTickets]=useState<SaasChamado[]|null>(null);
  const [financeError,setFinanceError]=useState(false);
  const [supportError,setSupportError]=useState(false);
  useEffect(()=>{
    let alive=true;
    if(canFinance)void saasApi.financeiro().then(v=>{if(alive)setFinance(v);}).catch(()=>{if(alive)setFinanceError(true);});
    if(canSupport)void saasApi.chamadosSuporte().then(v=>{if(alive)setTickets(v);}).catch(()=>{if(alive)setSupportError(true);});
    return ()=>{alive=false;};
  },[canFinance,canSupport]);
  const received=finance?.cobrancas.reduce((sum,c)=>sum+c.recebido,0)??0;
  const overdue=finance?.cobrancas.filter(c=>c.status==='VENCIDO').reduce((sum,c)=>sum+c.saldo,0)??0;
  const open=tickets?.filter(t=>t.status!=='RESOLVIDO'&&t.status!=='CANCELADO')??[];
  const dev=open.filter(t=>t.comDev);
  const alerts=useMemo(()=>{
    const now=new Date(),next=new Date(now.getTime()+7*86400000);
    const results:{title:string;detail:string;target:'finance'|'support';urgent:boolean}[]=[];
    if(finance){
      const overdueBills=finance.cobrancas.filter(c=>c.status==='VENCIDO');
      if(overdueBills.length)results.push({title:overdueBills.length+' cobrança(s) vencida(s)',detail:'Conferir registros e negociação',target:'finance',urgent:true});
      const soon=finance.cobrancas.filter(c=>c.saldo>0&&new Date(c.vencimento)>now&&new Date(c.vencimento)<=next);
      if(soon.length)results.push({title:soon.length+' cobrança(s) vencendo em 7 dias',detail:'Preparar contato com clientes',target:'finance',urgent:false});
      const grace=finance.empresas.filter(c=>c.inadimplente&&c.liberacaoFinanceiraAte&&new Date(c.liberacaoFinanceiraAte)>now&&new Date(c.liberacaoFinanceiraAte)<=next);
      if(grace.length)results.push({title:grace.length+' liberação(ões) financeira(s) próximas do fim',detail:'Revisar acordos temporários',target:'finance',urgent:true});
    }
    if(tickets){
      const critical=open.filter(t=>['URGENTE','ALTA'].includes(t.prioridade));
      if(critical.length)results.push({title:critical.length+' chamado(s) de alta prioridade',detail:'Revisar ordens ainda abertas',target:'support',urgent:true});
      if(dev.length)results.push({title:dev.length+' chamado(s) encaminhado(s) ao Dev',detail:'Acompanhar respostas do desenvolvimento',target:'support',urgent:false});
    }
    return results;
  },[finance,tickets,open.length,dev.length]);
  const sixMonths=useMemo(()=>{
    const now=new Date();
    return Array.from({length:6},(_,i)=>{
      const date=new Date(now.getFullYear(),now.getMonth()-5+i,1);
      const year=date.getFullYear(),month=date.getMonth();
      const sum=finance?.cobrancas.reduce((total,c)=>{
        // Detailed payment records override the legacy paid-in-full marker.
        const payments=c.pagamentos.length?c.pagamentos.map(p=>({date:p.pagoEm,value:Number(p.valor)}))
          :c.pagoEm?[{date:c.pagoEm,value:Number(c.valor)}]:[];
        return total+payments.filter(p=>{const d=new Date(p.date);return d.getFullYear()===year&&d.getMonth()===month;}).reduce((a,p)=>a+p.value,0);
      },0)??0;
      return {key:year+'-'+month,label:date.toLocaleDateString('pt-BR',{month:'short'}),value:sum};
    });
  },[finance]);
  const peak=Math.max(1,...sixMonths.map(m=>m.value));
  if(!canFinance&&!canSupport)return null;
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="text-lg font-extrabold">Central de operações</h3><p className="mt-1 text-xs text-slate-400">Indicadores e alertas calculados a partir dos registros do SaaS.</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {canFinance&&<><div className={card}><Wallet className="text-emerald-300" size={19}/><p className="mt-3 text-xs text-slate-400">Recebimentos registrados</p><strong className="mt-1 block text-xl">{finance?money(received):'—'}</strong></div>
        <div className={card}><ShieldAlert className="text-amber-300" size={19}/><p className="mt-3 text-xs text-slate-400">Saldo vencido</p><strong className="mt-1 block text-xl">{finance?money(overdue):'—'}</strong></div></>}
      {canSupport&&<><div className={card}><Headset className="text-emerald-300" size={19}/><p className="mt-3 text-xs text-slate-400">OS em andamento</p><strong className="mt-1 block text-xl">{tickets?open.length:'—'}</strong></div>
        <div className={card}><CalendarClock className="text-purple-300" size={19}/><p className="mt-3 text-xs text-slate-400">OS com o Dev</p><strong className="mt-1 block text-xl">{tickets?dev.length:'—'}</strong></div></>}
    </div>
    {(financeError||supportError)&&<p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Alguns indicadores não puderam ser consultados. Confira as permissões e a comunicação com o backend.</p>}
    <div className="grid gap-4 xl:grid-cols-2">
      {canFinance&&<section className={card}><div className="flex items-center justify-between gap-3"><div><h4 className="font-bold">Evolução dos recebimentos</h4><p className="mt-1 text-xs text-slate-400">Últimos seis meses · valores efetivamente registrados</p></div><ChartNoAxesCombined className="text-emerald-300" size={19}/></div>
        <div className="mt-6 flex h-40 items-end gap-3 border-b border-white/10 pb-2">{sixMonths.map(m=><div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-300" title={money(m.value)}>{m.value?money(m.value).replace('R$ ','').replace('R$ ',''):''}</span><div className="w-full max-w-16 rounded-t-lg bg-[#57d9ab]" style={{height:Math.max(3,Math.round(m.value/peak*90))+'px'}}/><span className="text-xs capitalize text-slate-400">{m.label}</span></div>)}</div>
        <button type="button" onClick={onFinance} className="mt-4 text-xs font-bold text-emerald-300">Abrir financeiro</button>
      </section>}
      <section className={card}><div className="flex items-center justify-between gap-3"><h4 className="font-bold">Precisa da sua atenção</h4><AlertTriangle size={19} className="text-amber-300"/></div>
        <div className="mt-4 space-y-2">{alerts.map((a,i)=><button key={i} onClick={a.target==='finance'?onFinance:onSupport} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:bg-white/5"><span className={'h-2 w-2 rounded-full '+(a.urgent?'bg-amber-400':'bg-emerald-400')}/><span className="flex-1"><strong className="block text-sm">{a.title}</strong><small className="mt-1 block text-slate-400">{a.detail}</small></span></button>)}
          {!alerts.length&&<p className="flex items-center gap-2 py-5 text-sm text-slate-400"><CircleCheckBig size={18} className="text-emerald-300"/> Nenhum alerta identificado nos registros consultados.</p>}
        </div>
        {canSupport&&<button type="button" onClick={onSupport} className="mt-4 text-xs font-bold text-emerald-300">Abrir central de suporte</button>}
      </section>
    </div>
  </div>;
}
