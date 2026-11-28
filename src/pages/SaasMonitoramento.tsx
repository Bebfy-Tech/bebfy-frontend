import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertCircle, Building2, Clock3, Download, RefreshCcw, Search, Users } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasTenantMonitor } from '../services/saas';

const DAY=86400000;
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const statusLabels:Record<SaasTenantMonitor['status'],string>={ATIVA:'Ativa',EM_TESTE:'Em teste',SUSPENSA:'Suspensa',CANCELADA:'Cancelada'};
type ActivityBand='RECENTE'|'INTERMEDIARIO'|'INATIVO'|'SEM_USO';
const labels:Record<ActivityBand,string>={RECENTE:'Até 7 dias',INTERMEDIARIO:'Entre 7 e 30 dias',INATIVO:'Mais de 30 dias',SEM_USO:'Sem registro'};
function band(r:SaasTenantMonitor,now:number):ActivityBand {
  if(!r.ultimoAcesso)return 'SEM_USO';
  const elapsed=Math.max(0,now-new Date(r.ultimoAcesso).getTime());
  return elapsed<=7*DAY?'RECENTE':elapsed<=30*DAY?'INTERMEDIARIO':'INATIVO';
}
function access(r:SaasTenantMonitor,now:number){
  if(r.status==='SUSPENSA'||r.status==='CANCELADA')return 'Restrição administrativa';
  if(!r.inadimplente)return 'Regular';
  if(r.liberacaoFinanceiraAte===undefined)return 'Inadimplente';
  return r.liberacaoFinanceiraAte&&new Date(r.liberacaoFinanceiraAte).getTime()>now?'Cortesia vigente':'Bloqueado financeiramente';
}
const when=(d:string)=>new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const age=(d:string,now:number)=>{const days=Math.floor(Math.max(0,now-new Date(d).getTime())/DAY);return days===0?'Há menos de 24 horas':days===1?'Há 1 dia':'Há '+days+' dias';};
const csvCell=(v:unknown)=>{const raw=String(v??'');return '"'+(/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw).replace(/"/g,'""')+'"';};
export function SaasMonitoramento({onOpenCompany}:{onOpenCompany:(id:number)=>void}) {
  const [rows,setRows]=useState<SaasTenantMonitor[]>([]);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('TODOS');
  const [status,setStatus]=useState('TODOS');
  const [risk,setRisk]=useState('TODOS');
  const [order,setOrder]=useState('RECENTES');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [loading,setLoading]=useState(true);
  const [available,setAvailable]=useState(false);
  const [error,setError]=useState('');
  const [snapshot,setSnapshot]=useState<number|null>(null);
  const [auto,setAuto]=useState(false);
  const active=useRef(false),pending=useRef(false);
  const load=useCallback(async()=>{
    if(pending.current)return;
    pending.current=true;setLoading(true);
    try{
      const result=await saasApi.monitoramento();
      if(!active.current)return;
      setRows(result);setSnapshot(result[0]?.consultadoEm?new Date(result[0].consultadoEm).getTime():Date.now());setAvailable(true);setError('');
    }catch{if(active.current){setAvailable(false);setError('Não foi possível atualizar as informações. Os dados anteriores podem estar desatualizados.');}}
    finally{pending.current=false;if(active.current)setLoading(false);}
  },[]);
  useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]);
  useEffect(()=>{
    if(!auto)return;
    const id=window.setInterval(()=>{if(!document.hidden)void load();},60000);
    return()=>window.clearInterval(id);
  },[auto,load]);
  const now=snapshot??Date.now();
  const counts=useMemo(()=>{const c:Record<ActivityBand,number>={RECENTE:0,INTERMEDIARIO:0,INATIVO:0,SEM_USO:0};for(const r of rows)c[band(r,now)]++;return c;},[rows,now]);
  const enabled=rows.reduce((n,r)=>n+r.usuariosAtivos,0);
  const recentUsers=rows.reduce((n,r)=>n+r.usuariosRecentes,0);
  const salesAvailable=rows.every(r=>r.vendasConcluidas7d!==undefined);
  const sales=rows.reduce((n,r)=>n+(r.vendasConcluidas7d??0),0);
  // Adoption alerts only concern companies in operation or evaluation.
  const operating=rows.filter(r=>r.status==='ATIVA'||r.status==='EM_TESTE');
  const needsAttention=operating.filter(r=>band(r,now)==='INATIVO'||band(r,now)==='SEM_USO');
  const noSales=operating.filter(r=>r.vendasConcluidas7d===0);
  const filtered=useMemo(()=>rows.filter(r=>{
    const q=normalize(search.trim());
    return normalize(r.nomeFantasia+' '+r.slug+' '+r.id+' '+(r.plano?.nome||'')).includes(q)
      &&(filter==='TODOS'||band(r,now)===filter)
      &&(status==='TODOS'||r.status===status)
      &&(risk==='TODOS'||risk==='ATENCAO'&&['ATIVA','EM_TESTE'].includes(r.status)&&['INATIVO','SEM_USO'].includes(band(r,now))||risk==='SEM_VENDAS'&&['ATIVA','EM_TESTE'].includes(r.status)&&r.vendasConcluidas7d===0||risk==='FINANCEIRO'&&r.inadimplente);
  }).sort((a,b)=>{
    const t=(r:SaasTenantMonitor)=>r.ultimoAcesso?new Date(r.ultimoAcesso).getTime():0;
    return (order==='NOME'?a.nomeFantasia.localeCompare(b.nomeFantasia,'pt-BR'):order==='ANTIGAS'?t(a)-t(b):order==='VENDAS'?(b.vendasConcluidas7d??-1)-(a.vendasConcluidas7d??-1):t(b)-t(a))||a.id-b.id;
  }),[rows,search,filter,status,risk,order,now]);
  const maxPage=Math.max(1,Math.ceil(filtered.length/pageSize)),actualPage=Math.min(page,maxPage);
  const reset=()=>{setSearch('');setFilter('TODOS');setStatus('TODOS');setRisk('TODOS');setOrder('RECENTES');setPage(1);};
  const selectBand=(value:string)=>{reset();setFilter(value);};
  const selectRisk=(value:string)=>{reset();setRisk(value);};
  const exportCsv=()=>{
    if(!available||loading)return;
    const records=[['Distribuidora','Domínio','Status','Plano','Última atividade','Faixa de atividade','Contas habilitadas','Usuários com atividade em 7 dias','Produtos','Clientes','Vendas registradas (total)','Vendas concluídas (7 dias)','Acesso financeiro/administrativo'],...filtered.map(r=>[r.nomeFantasia,r.slug,statusLabels[r.status],r.plano?.nome??'',r.ultimoAcesso?when(r.ultimoAcesso):'',labels[band(r,now)],r.usuariosAtivos,r.usuariosRecentes,r._count.produtos,r._count.clientes??'',r._count.vendas,r.vendasConcluidas7d??'',access(r,now)])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='bebfy-monitoramento.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="sc-page smon-page">
    <div className="sd-heading"><div><h2>Monitoramento das distribuidoras</h2><p>Atividade autenticada e adoção operacional dos clientes. Não representa disponibilidade do servidor nem usuários online em tempo real.</p></div><div className="sd-actions"><label className="smon-auto"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Atualização a cada 60 s</label><button disabled={loading} onClick={()=>void load()} className="sd-secondary"><RefreshCcw size={16}/> {loading?'Consultando…':'Atualizar'}</button></div></div>
    {error&&<p role="alert" className="sd-warning"><AlertCircle size={16}/> {error}</p>}
    <p className="sd-muted">Última consulta: {snapshot?when(new Date(snapshot).toISOString()):'—'} · {available?'Dados consultados (horário de Brasília)':'Sem confirmação atual — indicadores indisponíveis'}</p>
    <div className="sd-kpis">{([{label:'Distribuidoras cadastradas',value:rows.length,icon:Building2,action:reset},{label:'Atividade nos últimos 7 dias',value:counts.RECENTE,icon:Activity,action:()=>selectBand('RECENTE')},{label:'Mais de 30 dias sem atividade',value:counts.INATIVO,icon:Clock3,action:()=>selectBand('INATIVO')},{label:'Sem atividade registrada',value:counts.SEM_USO,icon:Users,action:()=>selectBand('SEM_USO')}] as const).map(({label,value,icon:Icon,action})=><button key={label} disabled={!available} onClick={action} className="sd-panel sd-kpi text-left"><span className="sd-icon"><Icon size={22}/></span><div><small>{label}</small><strong>{available?value:'—'}</strong><span>Empresas cadastradas</span></div></button>)}</div>
    <div className="smon-overview">
      <section className="sc-panel"><h3>Panorama de atividade</h3><div className="smon-bands">{(Object.keys(labels) as ActivityBand[]).map(key=><button key={key} disabled={!available} onClick={()=>selectBand(key)}><div><span>{labels[key]}</span><strong>{available?counts[key]:'—'}</strong></div><div className="smon-track"><span className={'smon-fill '+key.toLowerCase()} style={{width:(available&&rows.length?counts[key]/rows.length*100:0)+'%'}}/></div></button>)}</div></section>
      <section className="sc-panel"><h3>Utilização da plataforma</h3><dl className="sc-dl"><dt>Contas habilitadas</dt><dd>{available?enabled:'—'}</dd><dt>Usuários com atividade em 7 dias</dt><dd>{available?recentUsers:'—'}</dd><dt>Vendas concluídas em 7 dias</dt><dd>{available&&salesAvailable?sales:'—'}</dd></dl><p className="sd-muted">Contas habilitadas exigem usuário e funcionário ativos. Atividade recente inclui registros históricos de contas posteriormente desativadas.</p></section>
      <section className="sc-panel"><h3>Acompanhamento de adoção</h3><div className="smon-alerts"><button disabled={!available} onClick={()=>selectRisk('ATENCAO')}><span>Ativas/em teste com baixa atividade ou sem registro</span><strong>{available?needsAttention.length:'—'}</strong></button><button disabled={!available||!salesAvailable} onClick={()=>selectRisk('SEM_VENDAS')}><span>Ativas/em teste sem vendas concluídas em 7 dias</span><strong>{available&&salesAvailable?noSales.length:'—'}</strong></button><button disabled={!available} onClick={()=>selectRisk('FINANCEIRO')}><span>Com marcação de inadimplência</span><strong>{available?rows.filter(r=>r.inadimplente).length:'—'}</strong></button></div><p className="sd-muted">Sinais para acompanhamento comercial, não falhas do sistema.</p></section>
    </div>
    <section className="sc-panel"><div className="sc-filters"><label className="sd-search sc-query"><Search size={16}/><input aria-label="Pesquisar distribuidora" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Nome, domínio, código ou plano"/></label>
      <label>Atividade<select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="TODOS">Todas</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="TODOS">Todos</option>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Acompanhamento<select value={risk} onChange={e=>{setRisk(e.target.value);setPage(1);}}><option value="TODOS">Todos</option><option value="ATENCAO">Baixa atividade</option><option disabled={!salesAvailable} value="SEM_VENDAS">Sem vendas em 7 dias</option><option value="FINANCEIRO">Inadimplentes</option></select></label>
      <label>Ordenar<select value={order} onChange={e=>{setOrder(e.target.value);setPage(1);}}><option value="RECENTES">Atividade mais recente</option><option value="ANTIGAS">Menor atividade</option><option value="NOME">Nome</option><option disabled={!salesAvailable} value="VENDAS">Vendas recentes</option></select></label><button className="sd-secondary" onClick={reset}>Limpar</button></div></section>
    <section className="sc-panel sc-list"><div className="sd-panel-head"><h3>Distribuidoras · {available?filtered.length:'—'}</h3><button className="sd-secondary" disabled={!available} onClick={exportCsv}><Download size={16}/> Exportar CSV</button></div>
      <div className="sc-table-scroll"><table className="sc-table smon-table"><thead><tr><th>Distribuidora / plano</th><th>Última atividade</th><th>Contas habilitadas</th><th>Usuários em 7 dias</th><th>Produtos / clientes</th><th>Vendas concluídas em 7 dias</th><th>Acesso</th><th>Ação</th></tr></thead><tbody>{available&&filtered.slice((actualPage-1)*pageSize,actualPage*pageSize).map(r=><tr key={r.id}><td><strong>{r.nomeFantasia}</strong><small>#{r.id} · {r.slug}</small><small>{r.plano?.nome??(r.plano===null?'Sem plano':'—')} · {statusLabels[r.status]}</small></td><td><span className={'smon-activity '+band(r,now).toLowerCase()}>{labels[band(r,now)]}</span>{r.ultimoAcesso&&<><small>{when(r.ultimoAcesso)}</small><small>{age(r.ultimoAcesso,now)}</small></>}</td><td>{r.usuariosAtivos}<small>{r._count.funcionarios} funcionário(s)</small></td><td>{r.usuariosRecentes}</td><td>{r._count.produtos} / {r._count.clientes??'—'}</td><td>{r.vendasConcluidas7d??'—'}<small>{r._count.vendas} registros no total</small></td><td>{access(r,now)}</td><td><button onClick={()=>onOpenCompany(r.id)} className="sd-link">Abrir ficha</button></td></tr>)}</tbody></table>{loading&&!available?<p className="sd-empty">Consultando informações…</p>:!available?<p className="sd-empty">Consulta indisponível. Atualize os dados.</p>:!filtered.length?<p className="sd-empty">Nenhuma distribuidora encontrada.</p>:null}</div>
      <footer className="sc-pagination"><label>Por página <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><span>Página {actualPage} de {maxPage}</span><div className="sd-actions"><button className="sd-secondary" disabled={!available||actualPage<=1} onClick={()=>setPage(actualPage-1)}>Anterior</button><button className="sd-secondary" disabled={!available||actualPage>=maxPage} onClick={()=>setPage(actualPage+1)}>Próxima</button></div></footer></section>
    <p className="sd-muted">Última atividade corresponde ao último registro autenticado no backend. Não representa presença online, disponibilidade da infraestrutura, acesso remoto ou telemetria da máquina do cliente. Os indicadores são calculados na data da consulta.</p>
  </div>;
}
