import {useMemo,useState} from 'react';
import {Check,ChartNoAxesCombined,Layers,Plus,RefreshCcw,Search,Settings2,Users,Wallet} from 'lucide-react';
import {DISPONIVEIS} from '../services/saas';
import type {PlanoSaas,SaasModuloDescricao,TipoPlanoSaas} from '../services/saas';

const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const names:Record<TipoPlanoSaas,string>={VAREJO_BASICO:'Varejo Basic',VAREJO_PRO:'Varejo Pro',ATACADO_FULL:'Atacado · recursos disponíveis',PERSONALIZADO:'Personalizado'};
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function SaasPlans({planos,available,busy,descriptions,onCreate,onEdit,onRefresh}:{planos:PlanoSaas[];available:boolean;busy:boolean;descriptions:SaasModuloDescricao[];onCreate:()=>void;onEdit:(p:PlanoSaas)=>void;onRefresh:()=>void}){
 const [query,setQuery]=useState(''),[type,setType]=useState('TODOS'),[order,setOrder]=useState('PRECO');
 const complete=available&&planos.every(p=>p.resumo!==undefined);
 const count=complete?planos.reduce((s,p)=>s+(p.resumo?.ativas??0),0):null;
 // Accumulate cents rather than fractional currency. Potential revenue excludes trials.
 const revenue=complete?planos.reduce((s,p)=>s+Math.round(Number(p.precoMensal)*100)*(p.resumo?.ativas??0),0)/100:null;
 const kpis=[{label:'Planos cadastrados',value:available?String(planos.length):'—',sub:'Catálogo comercial',Icon:Layers},{label:'Assinaturas ativas',value:count===null?'—':String(count),sub:'Empresas ativas com plano',Icon:Users},{label:'Receita mensal potencial',value:revenue===null?'—':money(revenue),sub:'Valores dos planos ativos',Icon:Wallet},{label:'Ticket médio potencial',value:revenue===null||count===null?'—':money(count?revenue/count:0),sub:'Por assinatura ativa',Icon:ChartNoAxesCombined}];
 const filtered=useMemo(()=>planos.filter(p=>(type==='TODOS'||p.tipo===type)&&norm(p.nome+' '+p.id+' '+names[p.tipo]).includes(norm(query.trim()))).sort((a,b)=>order==='NOME'?a.nome.localeCompare(b.nome,'pt-BR'):order==='ATIVAS'?(b.resumo?.ativas??-1)-(a.resumo?.ativas??-1):Number(a.precoMensal)-Number(b.precoMensal)),[planos,type,query,order]);
 return <div className="sc-page sp-page">
 <div className="sd-heading"><div><h2>Planos e assinaturas</h2><p>Gerencie o catálogo, os módulos inclusos e as assinaturas da plataforma.</p></div><div className="sd-actions"><button className="sd-secondary" disabled={busy} onClick={onRefresh}><RefreshCcw size={15}/> Atualizar</button><button className="sd-primary" disabled={busy||!available} onClick={onCreate}><Plus size={17}/> Novo plano</button></div></div>
 <div className="sd-kpis">{kpis.map(k=><div className="sd-panel sd-kpi" key={k.label}><span className="sd-icon"><k.Icon size={22}/></span><div><small>{k.label}</small><strong>{k.value}</strong><span>{k.sub}</span></div></div>)}</div>
 {!available&&<p className="sd-warning" role="alert">Não foi possível consultar o catálogo de planos. Atualize os dados antes de continuar.</p>}
 {available&&!complete&&<p className="sd-warning" role="alert">Os totais de assinaturas não estão disponíveis na versão atual do backend. Atualize o backend antes de utilizar os indicadores comerciais.</p>}
 <section className="sc-panel"><div className="sc-filters"><label className="sd-search sc-query"><Search size={16}/><input aria-label="Pesquisar plano" placeholder="Nome, tipo ou código do plano" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option value="TODOS">Todos os tipos</option>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><label>Ordenação<select value={order} onChange={e=>setOrder(e.target.value)}><option value="PRECO">Menor mensalidade</option><option value="NOME">Nome A–Z</option><option value="ATIVAS">Mais assinaturas ativas</option></select></label><button className="sd-secondary" onClick={()=>{setQuery('');setType('TODOS');setOrder('PRECO');}}>Limpar</button></div></section>
 <div className="sd-panel-head"><h3 className="sp-section-title">Catálogo de planos</h3><span className="sd-muted">{available?filtered.length+' plano(s)':'—'}</span></div>
 <div className="sp-plans">{available&&filtered.map(p=>{
  const included=DISPONIVEIS.filter(m=>p.modulosPadrao?.includes(m.key));
  const r=p.resumo;
  return <article className="sc-panel sp-plan" key={p.id}><header className="sp-card-head"><span className="sd-icon"><Layers size={23}/></span><div><h3>{p.nome}</h3><p className="sd-muted">#{p.id} · {names[p.tipo]}</p></div></header><div className="sp-price"><strong>{money(Number(p.precoMensal))}</strong><span>/ mês</span></div><div className="sp-counts">{[{label:'Vinculadas',value:r?.total},{label:'Ativas',value:r?.ativas},{label:'Em teste',value:r?.emTeste},{label:'Suspensas',value:r?.suspensas},{label:'Canceladas',value:r?.canceladas}].map(c=><div key={c.label}><strong>{c.value??'—'}</strong><small>{c.label}</small></div>)}</div><div className="sp-features"><h4>{included.length} de {DISPONIVEIS.length} módulos incluídos</h4>{included.map(m=><div key={m.key}><Check size={15}/><span>{descriptions.find(d=>d.modulo===m.key)?.nome||m.nome}</span></div>)}{!included.length&&<p className="sd-muted">Nenhum módulo padrão selecionado.</p>}</div><div className="sp-plan-footer"><span className="sd-muted">Potencial mensal <strong>{r?money(Math.round(Number(p.precoMensal)*100)*r.ativas/100):'—'}</strong></span><button className="sd-secondary" disabled={busy} onClick={()=>onEdit(p)}><Settings2 size={16}/> Editar plano</button></div></article>;
 })}</div>
 {available&&!filtered.length&&<div className="sc-panel sd-empty">{planos.length?'Nenhum plano corresponde aos filtros.':'Nenhum plano cadastrado. Utilize Novo plano para iniciar.'}</div>}
 <p className="sd-muted">Receita e ticket médio potenciais consideram empresas com status ativo e plano vinculado. Não representam valores recebidos, nem descontam inadimplência. A geração de mensalidades permanece manual no financeiro.</p>
 </div>;
}
