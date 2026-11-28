import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { tenantPath } from '../services/tenantUrls';
import { useAuth } from '../contexts/AuthContext';
import { hasModule, routeModules } from '../services/moduleAccess';
type Alerta={id:string;categoria:string;titulo:string;quantidade:number;rota:string;lida:boolean};
type Checklist={percentual:number;itens:{titulo:string;rota:string;concluido:boolean}[]};
export function Notificacoes(){
 const {user,empresa,modules}=useAuth();
 const gestor=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const [aberto,setAberto]=useState(false),[alertas,setAlertas]=useState<Alerta[]>([]),[erro,setErro]=useState(false),[ocupado,setOcupado]=useState(false),[filtro,setFiltro]=useState('');
 const carregar=useCallback(async()=>{try{const {data}=await api.get<Alerta[]>('/experiencia/notificacoes');setAlertas(data);setErro(false);}catch{setErro(true);}},[]);
 useEffect(()=>{setAlertas([]);setAberto(false);if(!gestor)return;void carregar();const timer=window.setInterval(()=>void carregar(),60000);return()=>window.clearInterval(timer);},[gestor,user?.id,empresa?.id,carregar]);
 if(!gestor)return null;
 const visiveis=alertas.filter(a=>hasModule(modules,routeModules['/'+a.rota]));
 const novas=visiveis.filter(a=>!a.lida);
 const ler=async(ids:string[])=>{if(!ids.length)return;setOcupado(true);try{await api.post('/experiencia/notificacoes/ler',{ids});await carregar();}catch{setErro(true);}finally{setOcupado(false);}};
 return <div className="relative"><button type="button" title="Notificações" aria-label={`Notificações: ${novas.length} não lidas`} aria-expanded={aberto} onClick={()=>{setAberto(v=>!v);void carregar();}}><Bell size={19}/>{novas.length>0&&<span className="rounded-full bg-emerald-600 px-1.5 text-xs text-white">{novas.length}</span>}</button>
 {aberto&&<section className="absolute right-0 top-full z-50 mt-2 w-[min(320px,85vw)] rounded-xl border border-slate-600 bg-[#1c1e24] p-4 text-white shadow-xl" aria-label="Central de notificações" onKeyDown={e=>{if(e.key==='Escape')setAberto(false);}}>
 <div className="flex items-center justify-between"><h2 className="font-bold">Notificações</h2><button type="button" onClick={()=>setAberto(false)}>Fechar</button></div>
 <select className="my-3 w-full rounded border border-slate-600 bg-[#24272e] p-2 text-sm" aria-label="Filtrar notificações" value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Todas</option>{['Estoque','Validade','Financeiro'].map(c=><option key={c}>{c}</option>)}</select>
 <button type="button" disabled={ocupado||!novas.length} onClick={()=>void ler(novas.map(a=>a.id))}>Marcar todas como lidas</button>
 {erro&&<p role="alert" className="text-amber-300">Falha ao consultar ou atualizar notificações. <button type="button" onClick={()=>void carregar()}>Tentar novamente</button></p>}
 <div className="max-h-80 overflow-y-auto">{visiveis.filter(a=>!filtro||a.categoria===filtro).map(a=><article key={a.id} className="my-2 rounded-lg border border-slate-700 p-3"><p className="text-xs text-slate-400">{a.categoria} · {a.lida?'Lida':'Nova'}</p><p className="font-semibold">{a.titulo}: {a.quantidade}</p><Link className="text-blue-300" to={tenantPath(a.rota)} onClick={()=>setAberto(false)}>Consultar</Link>{!a.lida&&<button type="button" disabled={ocupado} onClick={()=>void ler([a.id])}>Marcar como lida</button>}</article>)}</div>
 {!erro&&!visiveis.filter(a=>!filtro||a.categoria===filtro).length&&<p className="mt-3 text-sm text-slate-400">Nenhuma notificação nesta categoria.</p>}</section>}</div>;
}
export function ChecklistInicial(){
 const {user,empresa}=useAuth();const gestor=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const [dados,setDados]=useState<Checklist|null>(null),[erro,setErro]=useState(false);
 useEffect(()=>{let ativo=true;setDados(null);setErro(false);if(gestor)void api.get<Checklist>('/experiencia/checklist').then(r=>{if(ativo)setDados(r.data);}).catch(()=>{if(ativo)setErro(true);});return()=>{ativo=false;};},[gestor,user?.id,empresa?.id]);
 if(!gestor)return null;
 return <section className="rounded-xl border border-slate-700 bg-[#1c1e24] p-5 text-white"><h2 className="text-xl font-bold">Configuração inicial</h2>{erro?<p role="alert">Não foi possível consultar o progresso.</p>:!dados?<p>Carregando checklist…</p>:<><p className="my-2">{dados.percentual}% concluído</p><progress className="w-full" max={100} value={dados.percentual}/><div className="mt-4 grid gap-3 sm:grid-cols-2">{dados.itens.map(i=><Link key={i.rota} to={tenantPath(i.rota)} className="rounded-lg border border-slate-700 p-3"><span className={i.concluido?'text-emerald-300':'text-slate-400'}>{i.concluido?'Concluído':'Pendente'}</span><p>{i.titulo}</p></Link>)}</div></>}</section>;
}
