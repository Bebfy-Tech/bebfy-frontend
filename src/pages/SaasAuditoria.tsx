import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Download, LockKeyhole, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasAuditEvent } from '../services/saas';
import { saasAuthApi } from '../services/saasAuth';
import type { SaasFuncionario } from '../services/saasAuth';

const method:{[key:string]:string}={POST:'Criação',PATCH:'Alteração',PUT:'Atualização',DELETE:'Exclusão'};
export function SaasAuditoria() {
  const [events,setEvents]=useState<SaasAuditEvent[]>([]);
  const [operators,setOperators]=useState<SaasFuncionario[]>([]);
  const [search,setSearch]=useState('');
  const [action,setAction]=useState('TODAS');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=async()=>{
    setLoading(true);
    try {
      const [items,users]=await Promise.all([saasApi.auditoria(),saasAuthApi.funcionarios()]);
      setEvents(items);setOperators(users);setError('');
    }catch{setError('Não foi possível carregar os registros de auditoria.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);
  const filtered=useMemo(()=>events.filter(e=>{
    const operator=operators.find(u=>u.id===e.operadorId);
    const text=[operator?.nome||'',e.rota,e.metodo,e.recursoId||''].join(' ').toLowerCase();
    return text.includes(search.toLowerCase())&&(action==='TODAS'||e.metodo===action);
  }),[events,operators,search,action]);
  const download=()=>{
    const rows=[['Data','Operador','Operação','Rota','Campos','Recurso'],
      ...filtered.map(e=>[new Date(e.criadoEm).toLocaleString('pt-BR'),operators.find(u=>u.id===e.operadorId)?.nome||e.operadorId,
        method[e.metodo]||e.metodo,e.rota,e.campos.join(', '),e.recursoId||''])];
    const quote=(s:string)=>'"'+String(s).replace(/"/g,'""')+'"';
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bebfy-auditoria.csv';a.click();URL.revokeObjectURL(url);
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-emerald-300">BEBFY / CONTROLE ADMINISTRATIVO</p><h2 className="mt-2 text-2xl font-extrabold">Auditoria da plataforma</h2><p className="mt-1 text-sm text-slate-400">Histórico das alterações realizadas no SaaS Admin, sem exibir valores de senhas ou tokens.</p></div><button type="button" onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm"><RefreshCcw size={17}/> Atualizar</button></div>
    {error&&<p role="alert" className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-3">{[
      {name:'Eventos registrados',count:events.length,icon:ClipboardList},
      {name:'Alterações',count:events.filter(e=>e.metodo==='PATCH').length,icon:ShieldCheck},
      {name:'Operadores envolvidos',count:new Set(events.map(e=>e.operadorId)).size,icon:LockKeyhole},
    ].map(({name,count,icon:Icon})=><div key={name} className="rounded-2xl border border-white/10 bg-[#202a2e] p-5"><Icon size={18} className="text-emerald-300"/><p className="mt-3 text-xs text-slate-400">{name}</p><strong className="mt-1 block text-2xl">{loading?'—':count}</strong></div>)}</div>
    <section className="rounded-2xl border border-white/10 bg-[#202a2e] p-5">
      <div className="flex flex-wrap gap-3"><div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar operador, operação ou recurso" className="min-h-11 w-full rounded-xl border border-white/15 bg-[#192528] px-3 pl-10 text-sm outline-none focus:border-emerald-300"/></div><select value={action} onChange={e=>setAction(e.target.value)} className="min-h-11 rounded-xl border border-white/15 bg-[#192528] px-3 text-sm"><option value="TODAS">Todas as ações</option><option value="POST">Criações</option><option value="PATCH">Alterações</option><option value="PUT">Atualizações</option><option value="DELETE">Exclusões</option></select><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-bold"><Download size={16}/> CSV</button></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead className="text-xs text-slate-400"><tr><th className="p-3">DATA</th><th className="p-3">OPERADOR</th><th className="p-3">AÇÃO</th><th className="p-3">ROTA / RECURSO</th><th className="p-3">CAMPOS ALTERADOS</th></tr></thead><tbody>{filtered.map(e=><tr key={e.id} className="border-t border-white/10 text-xs"><td className="p-3 text-slate-300">{new Date(e.criadoEm).toLocaleString('pt-BR')}</td><td className="p-3 font-semibold">{operators.find(u=>u.id===e.operadorId)?.nome||e.operadorId.slice(0,8)}</td><td className="p-3 text-emerald-200">{method[e.metodo]||e.metodo}</td><td className="max-w-[280px] break-words p-3">{e.rota}<span className="block text-slate-400">{e.recursoId||''}</span></td><td className="p-3 text-slate-400">{e.campos.length?e.campos.join(', '):'Sem campos de corpo'}</td></tr>)}</tbody></table>
      {loading&&<p className="mt-4 text-xs text-slate-400">Consultando auditoria...</p>}{!loading&&!filtered.length&&<p className="mt-4 text-sm text-slate-400">Nenhum evento encontrado.</p>}
      </div><p className="mt-5 text-xs text-slate-400">Exibe os registros mais recentes. Operações anteriores à implantação da auditoria não são reconstruídas retroativamente.</p>
    </section>
  </div>;
}
