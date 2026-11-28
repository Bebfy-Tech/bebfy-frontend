import {useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowRight,BarChart3,Building2,CalendarClock,CheckCircle2,Clock3,Code2,Download,Headset,Plus,Search,ShieldAlert,Wallet} from 'lucide-react';
import {saasApi} from '../services/saas';
import type {EmpresaSaas,SaasChamado,SaasFinanceiroResumo,SaasTenantMonitor} from '../services/saas';
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt=(n:number|null)=>n===null?'—':n.toLocaleString('pt-BR');
const monthKey=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(d);
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const statuses={ATIVA:'Ativa',EM_TESTE:'Em teste',SUSPENSA:'Suspensa',CANCELADA:'Cancelada'};
type Props={empresas:EmpresaSaas[]|null;canCompanies:boolean;canFinance:boolean;canSupport:boolean;onFinance:()=>void;onSupport:()=>void;onMonitor:()=>void;onCompanies:()=>void;onOpenCompany:(id:number)=>void;onCreate:()=>void;onExport:()=>void};
export function SaasExecutiveOverview(p:Props){
 const [finance,setFinance]=useState<SaasFinanceiroResumo|null>(null),[tickets,setTickets]=useState<SaasChamado[]|null>(null),[monitor,setMonitor]=useState<SaasTenantMonitor[]|null>(null);
 const [revision,setRevision]=useState(0),[updated,setUpdated]=useState<Date|null>(null);
 const [errors,setErrors]=useState<string[]>([]),[loading,setLoading]=useState(true),[months,setMonths]=useState(6),[query,setQuery]=useState('');
 useEffect(()=>{
  let active=true;setLoading(true);setErrors([]);setFinance(null);setTickets(null);setMonitor(null);
  const tasks:Promise<unknown>[]=[];
  if(p.canFinance)tasks.push(saasApi.financeiro().then(v=>{if(active)setFinance(v);}).catch(()=>{if(active)setErrors(e=>[...e,'Financeiro']);}));
  if(p.canSupport)tasks.push(saasApi.chamadosSuporte().then(v=>{if(active)setTickets(v);}).catch(()=>{if(active)setErrors(e=>[...e,'Suporte']);}));
  if(p.canCompanies)tasks.push(saasApi.monitoramento().then(v=>{if(active)setMonitor(v);}).catch(()=>{if(active)setErrors(e=>[...e,'Monitoramento']);}));
  void Promise.all(tasks).finally(()=>{if(active){setLoading(false);setUpdated(new Date());}});
  return()=>{active=false;};
 },[p.canCompanies,p.canFinance,p.canSupport,revision]);
 const companies=p.canCompanies?p.empresas:null;
 const now=new Date(),current=monthKey(now),in7=new Date(now.getTime()+7*86400000),in3=new Date(now.getTime()+3*86400000);
 const active=companies?.filter(e=>e.status==='ATIVA')??[];
 const mrr=companies?active.reduce((s,e)=>s+Number(e.plano?.precoMensal??0),0):null;
 const overdue=finance?.cobrancas.filter(c=>c.status==='VENCIDO')??[];
 const soon=finance?.cobrancas.filter(c=>c.saldo>0&&new Date(c.vencimento)>now&&new Date(c.vencimento)<=in7)??[];
 const grace=finance?.empresas.filter(e=>e.inadimplente&&e.liberacaoFinanceiraAte&&new Date(e.liberacaoFinanceiraAte)>now&&new Date(e.liberacaoFinanceiraAte)<=in3)??[];
 const open=tickets?.filter(t=>!['RESOLVIDO','CANCELADO'].includes(t.status))??[],dev=open.filter(t=>t.comDev||t.status==='COM_DEV');
 const inactive=monitor?.filter(e=>!e.ultimoAcesso||new Date(e.ultimoAcesso).getTime()<now.getTime()-30*86400000)??[];
 const payments=useMemo(()=>finance?.cobrancas.flatMap(c=>c.pagamentos.length?c.pagamentos.map(x=>({date:x.pagoEm,value:Number(x.valor)})):c.pagoEm?[{date:c.pagoEm,value:Number(c.valor)}]:[])??[],[finance]);
 const received=payments.filter(x=>monthKey(new Date(x.date))===current).reduce((s,x)=>s+x.value,0);
 const chart=useMemo(()=>{
  const d=new Date();const year=Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric'}).format(d));const month=Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',month:'numeric'}).format(d));
  return Array.from({length:months},(_,i)=>{const date=new Date(Date.UTC(year,month-1-months+1+i,15));const key=monthKey(date);return {key,label:date.toLocaleDateString('pt-BR',{month:'short',year:'2-digit',timeZone:'America/Sao_Paulo'}),value:payments.filter(x=>monthKey(new Date(x.date))===key).reduce((s,x)=>s+x.value,0)};});
 },[months,payments]);
 const peak=Math.max(1,...chart.map(x=>x.value));
 const recent=(companies??[]).filter(e=>normalize([e.nomeFantasia,e.slug,e.subdominio??'',e.cnpj??'',String(e.id)].join(' ')).includes(normalize(query.trim()))).sort((a,b)=>new Date(b.criadoEm).getTime()-new Date(a.criadoEm).getTime()).slice(0,6);
 const kpis=[...(p.canCompanies?[{label:'Distribuidoras ativas',value:companies?fmt(active.length):'—',sub:companies?fmt(companies.length)+' cadastradas':'Cadastro indisponível',Icon:Building2,tone:'green',action:p.onCompanies},{label:'Receita mensal potencial',value:mrr===null?'—':money(mrr),sub:'Planos das empresas ativas',Icon:Wallet,tone:'green',action:p.onFinance}]:[]),...(p.canFinance?[{label:'Cobranças vencidas',value:finance?fmt(overdue.length):'—',sub:finance?money(overdue.reduce((a,c)=>a+c.saldo,0))+' em atraso':'Dados indisponíveis',Icon:AlertTriangle,tone:'red',action:p.onFinance}]:[]),...(p.canSupport?[{label:'Chamados abertos',value:tickets?fmt(open.length):'—',sub:'Ordens não encerradas',Icon:Headset,tone:'green',action:p.onSupport}]:[])];
 const alerts=[...(p.canFinance?[{title:'Mensalidades vencendo',value:finance?fmt(soon.length):'—',sub:'Próximos 7 dias',Icon:CalendarClock,tone:'amber',action:p.onFinance},{title:'Liberações expirando',value:finance?fmt(grace.length):'—',sub:'Próximos 3 dias',Icon:Clock3,tone:'amber',action:p.onFinance}]:[]),...(p.canSupport?[{title:'Chamados com Dev',value:tickets?fmt(dev.length):'—',sub:'Ordens abertas com desenvolvimento',Icon:Code2,tone:'green',action:p.onSupport}]:[]),...(p.canCompanies?[{title:'Sem atividade recente',value:monitor?fmt(inactive.length):'—',sub:'30 dias ou sem registro',Icon:Activity,tone:'neutral',action:p.onMonitor}]:[])];
 const states=companies?Object.entries(statuses).map(([key,label])=>({key,label,value:companies.filter(e=>e.status===key).length})):[];
 return <div className="sd-page">
 <div className="sd-heading"><div><h2>Visão geral da plataforma</h2><p>Distribuidoras, financeiro, suporte e operação em um só lugar.</p><p>{loading?'Consultando indicadores…':updated?'Última consulta: '+updated.toLocaleString('pt-BR'):''} <button type="button" className="sd-secondary" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Atualizar indicadores</button></p></div>{p.canCompanies&&<div className="sd-actions"><button className="sd-secondary" disabled={!companies} onClick={p.onExport}><Download size={16}/> Exportar CSV</button><button className="sd-primary" onClick={p.onCreate}><Plus size={17}/> Nova distribuidora</button></div>}</div>
 {(errors.length>0||p.canCompanies&&!companies)&&<p className="sd-warning" role="alert"><AlertTriangle size={16}/> Dados indisponíveis: {[...errors,...(p.canCompanies&&!companies?['Distribuidoras']:[])].join(', ')}. Indicadores sem dados são exibidos como —.</p>}
 {loading&&<p className="sd-muted" role="status">Atualizando indicadores…</p>}
 <div className="sd-kpis">{kpis.map(k=><button key={k.label} className="sd-panel sd-kpi" onClick={k.action}><span className={'sd-icon '+k.tone}><k.Icon size={23}/></span><div><small>{k.label}</small><strong>{k.value}</strong><span>{k.sub}</span></div></button>)}</div>
 {alerts.length>0&&<section className="sd-panel sd-attention"><h3><ShieldAlert size={18}/> Alertas e atenção</h3><div className="sd-kpis">{alerts.map(a=><button key={a.title} className="sd-alert" onClick={a.action}><span className={'sd-icon '+a.tone}><a.Icon size={20}/></span><div><small>{a.title}</small><strong>{a.value}</strong><span>{a.sub}</span></div><ArrowRight size={15}/></button>)}</div></section>}
 <div className="sd-main-grid">
 {p.canFinance&&<section className="sd-panel sd-chart"><div className="sd-panel-head"><h3><BarChart3 size={19}/> Recebimentos mensais</h3><select aria-label="Período do gráfico" value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={6}>Últimos 6 meses</option><option value={12}>Últimos 12 meses</option></select></div><div className="sd-chart-summary"><span>Recebido neste mês</span><strong>{finance?money(received):'—'}</strong></div>{finance?<div className="sd-bars" aria-label="Gráfico de recebimentos mensais">{chart.map(x=><div key={x.key} className="sd-bar-col" title={x.label+' · '+money(x.value)}><span className="sd-bar-value">{x.value?money(x.value):'R$ 0'}</span><div className="sd-bar-track"><div className="sd-bar" style={{height:(x.value/peak*100)+'%'}}/></div><small>{x.label}</small></div>)}</div>:<p className="sd-empty">Recebimentos indisponíveis.</p>}<div className="sd-foot"><span>Pagamentos registrados manualmente · sem integração bancária</span><button onClick={p.onFinance}>Abrir financeiro <ArrowRight size={14}/></button></div></section>}
 {p.canCompanies&&<section className="sd-panel"><div className="sd-panel-head"><h3><Building2 size={19}/> Últimas distribuidoras</h3><button onClick={p.onCompanies}>Ver todas <ArrowRight size={14}/></button></div><label className="sd-search"><Search size={16}/><input aria-label="Pesquisar distribuidora" placeholder="Nome, código, documento ou domínio" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="sd-table-wrap"><table className="sd-table"><thead><tr><th>Distribuidora</th><th>Plano</th><th>Status</th></tr></thead><tbody>{recent.map(e=><tr key={e.id}><td><button className="sd-company" onClick={()=>p.onOpenCompany(e.id)}><strong>{e.nomeFantasia}</strong><small>#{e.id} · {e.subdominio||e.slug}</small></button></td><td>{e.plano?.nome??'Sem plano'}</td><td><span className={'sd-status '+e.status.toLowerCase()}>{statuses[e.status]}</span></td></tr>)}</tbody></table>{!recent.length&&<p className="sd-empty">{companies?'Nenhuma distribuidora encontrada.':'Dados indisponíveis.'}</p>}</div></section>}
 </div>
 <div className="sd-bottom-grid">
 {p.canCompanies&&<section className="sd-panel"><h3><Activity size={18}/> Panorama operacional</h3>{states.map(s=><div className="sd-meter" key={s.key}><div><span>{s.label}</span><b>{s.value}</b></div><div className="sd-meter-track"><span className={s.key.toLowerCase()} style={{width:(companies?.length?s.value/companies.length*100:0)+'%'}}/></div></div>)}{!companies&&<p className="sd-empty">Dados indisponíveis.</p>}</section>}
 {p.canFinance&&<section className="sd-panel"><h3><Wallet size={18}/> Resumo financeiro</h3><dl className="sd-summary"><dt>Recebido no mês</dt><dd>{finance?money(received):'—'}</dd><dt>Saldo vencido</dt><dd>{finance?money(overdue.reduce((s,c)=>s+c.saldo,0)):'—'}</dd><dt>Saldo em aberto total</dt><dd>{finance?money(finance.cobrancas.reduce((s,c)=>s+Math.max(0,c.saldo),0)):'—'}</dd><dt>Empresas inadimplentes</dt><dd>{finance?fmt(finance.empresas.filter(e=>e.inadimplente).length):'—'}</dd></dl><button className="sd-link" onClick={p.onFinance}>Consultar cobranças <ArrowRight size={14}/></button></section>}
 {p.canSupport&&<section className="sd-panel"><h3><Headset size={18}/> Suporte e acompanhamento</h3><dl className="sd-summary"><dt>Ordens em aberto</dt><dd>{tickets?fmt(open.length):'—'}</dd><dt>Alta prioridade / urgente</dt><dd>{tickets?fmt(open.filter(t=>['ALTA','URGENTE'].includes(t.prioridade)).length):'—'}</dd><dt>Com desenvolvimento</dt><dd>{tickets?fmt(dev.length):'—'}</dd><dt>Resolvidas no mês</dt><dd>{tickets?fmt(tickets.filter(t=>t.status==='RESOLVIDO'&&t.resolvidoEm&&monthKey(new Date(t.resolvidoEm))===current).length):'—'}</dd></dl><button className="sd-link" onClick={p.onSupport}>Abrir central de suporte <ArrowRight size={14}/></button></section>}
 </div>
 {!kpis.length&&<section className="sd-panel"><h3><CheckCircle2 size={18}/> Bem-vindo ao Bebfy</h3><p className="sd-muted">Utilize os módulos autorizados no menu lateral.</p></section>}
 <p className="sd-muted">Receita potencial não equivale a pagamento recebido. Indicadores de uso baseiam-se na atividade autenticada registrada, não em disponibilidade da infraestrutura.</p>
 </div>;
}
