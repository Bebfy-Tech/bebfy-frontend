import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Building2, Clock3, RefreshCcw, Search, Users } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasTenantMonitor } from '../services/saas';

const panel='rounded-2xl border border-white/10 bg-[#202b2e] p-5';
export function SaasMonitoramento({onOpenCompany}:{onOpenCompany:(id:number)=>void}) {
  const [rows,setRows]=useState<SaasTenantMonitor[]>([]);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('TODOS');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=async()=>{
    setLoading(true);
    try{setRows(await saasApi.monitoramento());setError('');}
    catch{setError('Não foi possível consultar os acessos das distribuidoras.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);
  const now=Date.now();
  const recent=rows.filter(r=>r.ultimoAcesso&&new Date(r.ultimoAcesso).getTime()>=now-7*86400000).length;
  const inactive=rows.filter(r=>!r.ultimoAcesso||new Date(r.ultimoAcesso).getTime()<now-30*86400000).length;
  const filtered=useMemo(()=>rows.filter(r=>{
    const searched=r.nomeFantasia.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))||r.slug.toLowerCase().includes(search.toLowerCase());
    const last=r.ultimoAcesso?new Date(r.ultimoAcesso).getTime():0;
    return searched&&(filter==='TODOS'||filter==='RECENTE'&&last>=now-7*86400000||filter==='INATIVO'&&last<now-30*86400000||filter==='SEM_USO'&&!r.ultimoAcesso);
  }),[rows,search,filter,now]);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-bold tracking-widest text-emerald-300">BEBFY / OPERAÇÕES</p><h2 className="mt-2 text-2xl font-extrabold">Monitoramento das distribuidoras</h2><p className="mt-1 text-sm text-slate-400">Acompanhamento de uso e adoção, com base em sessões e cadastros registrados.</p></div>
      <button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm"><RefreshCcw size={17}/> Atualizar</button>
    </div>
    {error&&<p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {([{label:'Distribuidoras',value:rows.length,icon:Building2},{label:'Com acesso nos últimos 7 dias',value:recent,icon:Activity},{label:'Sem acesso há mais de 30 dias',value:inactive,icon:Clock3}] as const).map(({label,value,icon:Icon})=><div key={label} className={panel}><Icon size={19} className="text-emerald-300"/><p className="mt-3 text-xs text-slate-400">{label}</p><strong className="mt-1 block text-2xl">{loading?'—':value}</strong></div>)}
    </div>
    <div className={panel}>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar distribuidora" className="w-full rounded-xl border border-white/15 bg-[#162326] px-4 py-3 pl-10 text-sm outline-none focus:border-emerald-300"/></div>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border border-white/15 bg-[#162326] px-4 py-3 text-sm">
          <option value="TODOS">Todos os clientes</option><option value="RECENTE">Acesso nos últimos 7 dias</option><option value="INATIVO">Sem acesso há 30 dias</option><option value="SEM_USO">Nunca registrou atividade</option>
        </select>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="text-xs text-slate-400"><tr><th className="p-3">DISTRIBUIDORA</th><th className="p-3">ÚLTIMA ATIVIDADE</th><th className="p-3">USUÁRIOS ATIVOS</th><th className="p-3">PRODUTOS</th><th className="p-3">VENDAS</th><th className="p-3">ACESSO</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id} className="border-t border-white/10 hover:bg-white/[.025]"><td className="p-3"><button onClick={()=>onOpenCompany(r.id)} className="text-left text-sm font-bold hover:text-emerald-300">{r.nomeFantasia}</button><p className="mt-1 text-xs text-slate-500">{r.slug} · {r.status}</p></td><td className="p-3 text-xs text-slate-300">{r.ultimoAcesso?new Date(r.ultimoAcesso).toLocaleString('pt-BR'):'Sem atividade registrada'}</td><td className="p-3"><span className="inline-flex items-center gap-1 text-sm"><Users size={14}/> {r.usuariosAtivos}</span><p className="mt-1 text-xs text-slate-400">{r.usuariosRecentes} recentes</p></td><td className="p-3 text-sm">{r._count.produtos}</td><td className="p-3 text-sm">{r._count.vendas}</td><td className="p-3">{r.inadimplente?<span className="text-xs font-bold text-amber-200">Inadimplente</span>:<span className="text-xs font-bold text-emerald-200">Regular</span>}</td></tr>)}</tbody></table>
        {loading&&<p className="mt-4 text-sm text-slate-400">Consultando informações...</p>}
        {!loading&&!filtered.length&&<p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><AlertCircle size={17}/> Nenhuma distribuidora encontrada.</p>}
      </div>
    </div>
    <p className="text-xs text-slate-400">Último acesso corresponde à última atividade autenticada registrada no backend. Não é um indicador em tempo real e não substitui monitoramento de disponibilidade da infraestrutura.</p>
  </div>;
}
