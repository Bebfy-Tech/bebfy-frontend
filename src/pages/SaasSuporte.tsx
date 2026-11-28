import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Code2, Download, MessageCircle, Plus, RefreshCcw, Search, ShieldCheck, Timer, X } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasChamado, SaasChamadoEvento, SaasChamadoAnexo, CriarSaasChamado, AtualizarSaasChamado, ChamadoStatus, ChamadoCategoria, ChamadoPrioridade, EmpresaSaas } from '../services/saas';

const statuses: Record<ChamadoStatus,string> = {
  PENDENTE:'Pendente',EM_ATENDIMENTO:'Em atendimento',AGUARDANDO_CLIENTE:'Aguardando cliente',
  COM_DEV:'Com o Dev',RESOLVIDO:'Resolvido',CANCELADO:'Cancelado',
};
const priorities:Record<ChamadoPrioridade,string> = {BAIXA:'Baixa',NORMAL:'Normal',ALTA:'Alta',URGENTE:'Urgente'};
const categories:Record<ChamadoCategoria,string> = {DUVIDA:'Dúvida',ERRO:'Erro',CONFIGURACAO:'Configuração',FINANCEIRO:'Financeiro',SOLICITACAO:'Solicitação',OUTRO:'Outro'};
const statusClass:Record<ChamadoStatus,string>={
  PENDENTE:'bg-amber-400/10 text-amber-200',EM_ATENDIMENTO:'bg-sky-400/10 text-sky-200',
  AGUARDANDO_CLIENTE:'bg-violet-400/10 text-violet-200',COM_DEV:'bg-fuchsia-400/10 text-fuchsia-200',
  RESOLVIDO:'bg-emerald-400/10 text-emerald-200',CANCELADO:'bg-slate-500/20 text-slate-300',
};
const input='ss-field mt-1 w-full rounded-md border px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300';
const panel='sc-panel ss-panel';
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const priorityOrder:Record<ChamadoPrioridade,number>={URGENTE:0,ALTA:1,NORMAL:2,BAIXA:3};
const defaultForm=(empresaId=0):CriarSaasChamado=>({empresaId,titulo:'',descricao:'',contatoNome:'',contatoTelefone:'',categoria:'DUVIDA',prioridade:'NORMAL'});
const errText=(err:unknown)=>{const e=err as {response?:{data?:{message?:string|string[]}};message?:string};const m=e.response?.data?.message??e.message;return Array.isArray(m)?m.join('; '):m||'Não foi possível salvar os dados.';};
const when=(d:string)=>new Date(d).toLocaleString('pt-BR');
function whatsappLink(tel:string|null,numero:number) {
  const digits=(tel||'').replace(/\D/g,'');
  if(![10,11].includes(digits.length)&&!([12,13].includes(digits.length)&&digits.startsWith('55')))return '';
  const international=digits.startsWith('55')&&digits.length>=12?digits:'55'+digits;
  return 'https://wa.me/'+international+'?text='+encodeURIComponent('Olá! Estamos acompanhando seu chamado Bebfy #'+numero+'.');
}
export function SaasSuporte({empresas,initialCompanyId,onOpenCompany,canOpenCompany}:{empresas:EmpresaSaas[];initialCompanyId?:number|null;onOpenCompany:(id:number)=>void;canOpenCompany:boolean}) {
  const [tickets,setTickets]=useState<SaasChamado[]>([]);
  const [operators,setOperators]=useState<Array<{id:string;nome:string;codigo:number}>>([]);
  const [supportCompanies,setSupportCompanies]=useState<Array<{id:number;nomeFantasia:string;slug:string}>>([]);
  const [selected,setSelected]=useState<SaasChamado|null>(null);
  const [detailTab,setDetailTab]=useState<'resumo'|'historico'|'anexos'>('resumo');
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState('');
  const detailSeq=useRef(0);
  const currentId=useRef<string|null>(null);
  const [priorityFilter,setPriorityFilter]=useState('TODAS');
  const [categoryFilter,setCategoryFilter]=useState('TODAS');
  const [responsibleFilter,setResponsibleFilter]=useState('TODOS');
  const [order,setOrder]=useState('RECENTES');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [available,setAvailable]=useState(false);
  const [form,setForm]=useState<CriarSaasChamado>(()=>defaultForm(initialCompanyId||0));
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState<AtualizarSaasChamado>({});
  const [newTicket,setNewTicket]=useState(false);
  const [interaction,setInteraction]=useState('');
  const [attachments,setAttachments]=useState<SaasChamadoAnexo[]>([]);
  const [evidence,setEvidence]=useState<File|null>(null);
  const [statusFilter,setStatusFilter]=useState('TODOS');
  const [companyFilter,setCompanyFilter]=useState(initialCompanyId||0);
  const [devFilter,setDevFilter]=useState('TODOS');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const reload=useCallback(async()=>{
    try {const rows=await saasApi.chamadosSuporte();setTickets(rows);setAvailable(true);}
    catch(e){setAvailable(false);setError(errText(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    void reload();
    void saasApi.operadoresSuporte().then(setOperators).catch(()=>setError('Não foi possível consultar os responsáveis.'));
    void saasApi.empresasSuporte().then(setSupportCompanies).catch(()=>setError('Não foi possível consultar as distribuidoras.'));
  },[reload]);
  const filtered=useMemo(()=>tickets.filter(t=>{
    const q=normalize(search.trim());
    const matches=!q||[String(t.numero),t.titulo,t.empresa.nomeFantasia,t.contatoNome||'',t.devResponsavel||'',t.empresa.slug].some(v=>normalize(v).includes(q));
    return matches&&(!companyFilter||t.empresaId===companyFilter)&&(statusFilter==='TODOS'||(statusFilter==='ABERTOS'?!['RESOLVIDO','CANCELADO'].includes(t.status):t.status===statusFilter))
      &&(devFilter==='TODOS'||(devFilter==='DEV'?t.comDev:!t.comDev))
      &&(priorityFilter==='TODAS'||t.prioridade===priorityFilter)&&(categoryFilter==='TODAS'||t.categoria===categoryFilter)
      &&(responsibleFilter==='TODOS'||(responsibleFilter==='SEM'? !t.responsavelId:t.responsavelId===responsibleFilter));
  }).sort((a,b)=>(order==='PRIORIDADE'?priorityOrder[a.prioridade]-priorityOrder[b.prioridade]:0)||(order==='ANTIGAS'?a.criadoEm.localeCompare(b.criadoEm):b.atualizadoEm.localeCompare(a.atualizadoEm))||b.numero-a.numero),[tickets,search,statusFilter,devFilter,companyFilter,priorityFilter,categoryFilter,responsibleFilter,order]);
  const outstanding=tickets.filter(t=>!['RESOLVIDO','CANCELADO'].includes(t.status));
  const maxPage=Math.max(1,Math.ceil(filtered.length/pageSize)),actualPage=Math.min(page,maxPage);
  const resetFilters=()=>{setSearch('');setCompanyFilter(0);setStatusFilter('TODOS');setDevFilter('TODOS');setPriorityFilter('TODAS');setCategoryFilter('TODAS');setResponsibleFilter('TODOS');setOrder('RECENTES');setPage(1);};
  const closeDetail=()=>{++detailSeq.current;currentId.current=null;setSelected(null);setEditing(false);setDetailLoading(false);setDetailError('');setAttachments([]);setEvidence(null);setInteraction('');};
  const run=async(task:()=>Promise<unknown>,success:string)=>{
    if(busy)return false;
    setBusy(true);setError('');setMessage('');
    try{await task();await reload();setMessage(success);return true;}
    catch(e){setError(errText(e));return false;}
    finally{setBusy(false);}
  };
  const open=async(t:SaasChamado,keepTab=false)=>{
    const changed=currentId.current!==t.id;
    currentId.current=t.id;const seq=++detailSeq.current;
    setEditing(false);setDetailError('');setSelected(t);setDetailLoading(true);
    if(changed){setInteraction('');setAttachments([]);setEvidence(null);}
    if(!keepTab)setDetailTab('resumo');
    setEditForm({titulo:t.titulo,descricao:t.descricao,contatoNome:t.contatoNome||'',contatoTelefone:t.contatoTelefone||'',categoria:t.categoria,prioridade:t.prioridade,status:t.status,comDev:t.comDev,responsavelId:t.responsavelId||'',devResponsavel:t.devResponsavel||'',solucao:t.solucao||''});
    try{const [chamado,anexos]=await Promise.all([saasApi.chamadoSuporte(t.id),saasApi.anexosChamado(t.id)]);
      if(seq===detailSeq.current){setSelected(chamado);setAttachments(anexos);}
    }catch(e){if(seq===detailSeq.current)setDetailError(errText(e));}
    finally{if(seq===detailSeq.current)setDetailLoading(false);}
  };
  const edit=(t:SaasChamado,status?:ChamadoStatus)=>{
    setError('');setEditForm({titulo:t.titulo,descricao:t.descricao,contatoNome:t.contatoNome||'',contatoTelefone:t.contatoTelefone||'',categoria:t.categoria,prioridade:t.prioridade,status:status??t.status,comDev:t.comDev,responsavelId:t.responsavelId||'',devResponsavel:t.devResponsavel||'',solucao:t.solucao||''});
    setEditing(true);
  };
  const submitCreate=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!form.empresaId||form.titulo.trim().length<3||form.descricao.trim().length<5){setError('Informe distribuidora, assunto e descrição válidos.');return;}
    const ok=await run(()=>saasApi.criarChamadoSuporte(form),'Ordem de serviço cadastrada com sucesso.');
    if(ok){setNewTicket(false);setForm(defaultForm());}
  };
  const submitEdit=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected)return;
    if((editForm.status??selected.status)==='RESOLVIDO'&&!(editForm.solucao||'').trim()){setError('Descreva a solução antes de resolver o chamado.');return;}
    const ok=await run(()=>saasApi.atualizarChamadoSuporte(selected.id,editForm),'Ordem de serviço atualizada.');
    if(ok){setEditing(false);void open(selected,true);}
  };
  const addInteraction=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected||interaction.trim().length<2)return;
    const ok=await run(()=>saasApi.registrarInteracaoSuporte(selected.id,interaction.trim()),'Atendimento registrado no histórico.');
    if(ok){setInteraction('');void open(selected,true);}
  };
  const changeStatus=async(t:SaasChamado,status:ChamadoStatus)=>{
    if(status==='RESOLVIDO'){edit(t,status);return;}
    if(!window.confirm('Alterar OS #'+t.numero+' para '+statuses[status]+'?'))return;
    const ok=await run(()=>saasApi.atualizarChamadoSuporte(t.id,{status,comDev:status==='COM_DEV'?true:false}),'Situação alterada.');
    if(ok&&selected?.id===t.id)void open(t,true);
  };
  const uploadEvidence=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected||!evidence)return;
    if(evidence.size>3*1024*1024){setError('O arquivo deve ter até 3 MB.');return;}
    const ok=await run(()=>saasApi.anexarChamado(selected.id,evidence),'Evidência anexada à OS.');
    if(ok){setEvidence(null);void open(selected,true);}
  };
  const downloadEvidence=async(anexo:SaasChamadoAnexo)=>{
    setError('');
    try{
      const blob=await saasApi.baixarAnexoChamado(anexo.chamadoId,anexo.id);
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=anexo.nome;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(errText(e));}
  };
  const downloadCsv=()=>{
    const columns=[['OS','Distribuidora','Título','Prioridade','Status','Com Dev','Dev responsável','Criado em'],
      ...filtered.map(t=>[String(t.numero),t.empresa.nomeFantasia,t.titulo,priorities[t.prioridade],statuses[t.status],t.comDev?'Sim':'Não',t.devResponsavel||'',when(t.criadoEm)])];
    const esc=(v:string)=>'"'+(/^[\s]*[=+\-@]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
    const content='\uFEFF'+columns.map(row=>row.map(esc).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='bebfy-ordens-suporte.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="sc-page ss-page text-white">
    <div className="sd-heading"><div><h2>Central de suporte</h2><p>Ordens de serviço e atendimentos manuais pelo WhatsApp.</p></div><div className="sd-actions"><button disabled={busy||loading} onClick={()=>{setError('');void reload();}} className="sd-secondary"><RefreshCcw size={16}/> Atualizar</button><button disabled={busy} onClick={()=>{setNewTicket(true);setForm(defaultForm(companyFilter||initialCompanyId||0));setError('');}} className="sd-primary"><Plus size={17}/> Abrir OS</button></div></div>
    {error&&<p role="alert" className="sd-warning">{error}</p>}{message&&<p role="status" className="text-emerald-300 text-sm">{message}</p>}
    <div className="sd-kpis">{([{name:'OS em aberto',value:outstanding.length,icon:ClipboardList,filter:'ABERTOS',dev:'TODOS'},{name:'Aguardando cliente',value:tickets.filter(t=>t.status==='AGUARDANDO_CLIENTE').length,icon:Timer,filter:'AGUARDANDO_CLIENTE',dev:'TODOS'},{name:'Com desenvolvimento',value:outstanding.filter(t=>t.comDev).length,icon:Code2,filter:'ABERTOS',dev:'DEV'},{name:'Resolvidas',value:tickets.filter(t=>t.status==='RESOLVIDO').length,icon:ShieldCheck,filter:'RESOLVIDO',dev:'TODOS'}] as const).map(({name,value,icon:Icon,filter,dev})=><button key={name} disabled={busy} className="sd-panel sd-kpi text-left" onClick={()=>{resetFilters();setStatusFilter(filter);setDevFilter(dev);closeDetail();}}><span className="sd-icon"><Icon size={22}/></span><div><small>{name}</small><strong>{available?value:'—'}</strong><span>Registros consultados</span></div></button>)}</div>
    {tickets.length>=1500&&<p className="sd-warning">A consulta atual retorna até 1.500 OS atualizadas recentemente. Indicadores e exportação se limitam a esses registros.</p>}
    <section className="sc-panel"><div className="sc-filters"><label className="sd-search sc-query"><Search size={16}/><input aria-label="Buscar ordem de serviço" placeholder="Número, distribuidora, assunto ou contato" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>
    <label>Distribuidora<select value={companyFilter} onChange={e=>{setCompanyFilter(Number(e.target.value));setPage(1);}}><option value={0}>Todas</option>{(supportCompanies.length?supportCompanies:empresas).map(c=><option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}</select></label>
    <label>Status<select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}><option value="TODOS">Todos</option><option value="ABERTOS">Em aberto</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Prioridade<select value={priorityFilter} onChange={e=>{setPriorityFilter(e.target.value);setPage(1);}}><option value="TODAS">Todas</option>{Object.entries(priorities).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Categoria<select value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}}><option value="TODAS">Todas</option>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Equipe<select value={devFilter} onChange={e=>{setDevFilter(e.target.value);setPage(1);}}><option value="TODOS">Toda a equipe</option><option value="DEV">Com Dev</option><option value="SUPORTE">Sem Dev</option></select></label>
    <label>Responsável<select value={responsibleFilter} onChange={e=>{setResponsibleFilter(e.target.value);setPage(1);}}><option value="TODOS">Todos</option><option value="SEM">Não atribuído</option>{operators.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
    <label>Ordenar<select value={order} onChange={e=>{setOrder(e.target.value);setPage(1);}}><option value="RECENTES">Última atualização</option><option value="ANTIGAS">Mais antigas</option><option value="PRIORIDADE">Prioridade</option></select></label><button className="sd-secondary" onClick={resetFilters}>Limpar</button></div></section>
    <div className={selected?'ss-workspace ss-selected':'ss-workspace'}>
    <section className="sc-panel sc-list"><div className="sd-panel-head"><h3>Ordens de serviço · {available?filtered.length:'—'}</h3><button disabled={!available||busy} onClick={downloadCsv} className="sd-secondary"><Download size={16}/> CSV</button></div><div className="sc-table-scroll"><table className="sc-table ss-table"><thead><tr><th>OS / Distribuidora</th><th>Assunto</th><th>Prioridade</th><th>Status</th><th>Responsável / equipe</th><th>Ação</th></tr></thead><tbody>{available&&filtered.slice((actualPage-1)*pageSize,actualPage*pageSize).map(t=><tr key={t.id} aria-selected={selected?.id===t.id}><td><strong>#{t.numero}</strong><small>{t.empresa.nomeFantasia}</small></td><td><button disabled={busy} className="sd-link text-left" onClick={()=>void open(t)}>{t.titulo}</button><small>{categories[t.categoria]} · {new Date(t.atualizadoEm).toLocaleDateString('pt-BR')}</small></td><td><span className={t.prioridade==='URGENTE'?'text-rose-300':t.prioridade==='ALTA'?'text-amber-300':'text-slate-300'}>{priorities[t.prioridade]}</span></td><td><span className={'rounded-md px-2 py-1 text-xs font-semibold '+statusClass[t.status]}>{statuses[t.status]}</span></td><td>{operators.find(o=>o.id===t.responsavelId)?.nome||(t.responsavelId?'Responsável não listado':'Não atribuído')}<small>{t.comDev?'Dev · '+(t.devResponsavel||'Não informado'):'Suporte'}</small></td><td><button disabled={busy} className="sd-link" onClick={()=>void open(t)}>Gerenciar</button></td></tr>)}</tbody></table>{loading?<p className="sd-empty">Carregando ordens de serviço…</p>:!available?<p className="sd-empty">Consulta indisponível. Atualize os dados.</p>:!filtered.length?<p className="sd-empty">Nenhuma OS encontrada.</p>:null}</div><footer className="sc-pagination"><label>Por página <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><span>Página {actualPage} de {maxPage}</span><div className="sd-actions"><button className="sd-secondary" disabled={busy||actualPage<=1} onClick={()=>setPage(actualPage-1)}>Anterior</button><button className="sd-secondary" disabled={busy||actualPage>=maxPage} onClick={()=>setPage(actualPage+1)}>Próxima</button></div></footer></section>
    {selected&&<section className={panel+' ss-detail'}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-emerald-300">ORDEM DE SERVIÇO #{selected.numero}</p><h3 className="mt-1 text-xl font-extrabold">{selected.titulo}</h3><p className="mt-2 text-xs text-slate-400">{selected.empresa.nomeFantasia} · Aberto em {when(selected.criadoEm)}</p></div><div className="flex flex-wrap gap-2">{canOpenCompany&&<button disabled={busy} type="button" onClick={()=>onOpenCompany(selected.empresaId)} className="sd-secondary">Ver distribuidora</button>}<button type="button" disabled={busy||detailLoading||!!detailError} onClick={()=>edit(selected)} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-bold text-[#102a21]">Editar OS</button><button type="button" aria-label="Fechar detalhes" disabled={busy} onClick={closeDetail} className="rounded-xl border border-white/15 p-2"><X size={16}/></button></div></div>
      <nav className="sc-tabs" aria-label="Ficha da ordem de serviço">{(["resumo","historico","anexos"] as const).map(t=><button key={t} aria-pressed={detailTab===t} disabled={busy} onClick={()=>setDetailTab(t)}>{t==="resumo"?"Resumo":t==="historico"?"Histórico":"Anexos"}</button>)}</nav>{detailError&&<p className="sd-warning" role="alert">{detailError}</p>}{detailLoading&&<p className="sd-muted">Carregando detalhes…</p>}
      {detailTab==="resumo"&&<>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Situação</p><p className="mt-2 font-bold">{statuses[selected.status]}</p></div>
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Prioridade</p><p className="mt-2 font-bold">{priorities[selected.prioridade]}</p></div>
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Responsável / Dev</p><p className="mt-2 text-sm font-bold">{operators.find(o=>o.id===selected.responsavelId)?.nome||'Não atribuído'} · {selected.comDev?(selected.devResponsavel||'Encaminhado ao Dev'):'Sem Dev'}</p></div>
      </div>
      <dl className="sc-dl"><dt>Categoria</dt><dd>{categories[selected.categoria]}</dd><dt>Contato</dt><dd>{selected.contatoNome||"Não informado"}</dd><dt>Telefone</dt><dd>{selected.contatoTelefone||"Não informado"}</dd><dt>Última atualização</dt><dd>{when(selected.atualizadoEm)}</dd><dt>Resolução</dt><dd>{selected.resolvidoEm?when(selected.resolvidoEm):"—"}</dd></dl><p className="mt-3 whitespace-pre-wrap rounded-md bg-white/[.035] p-3 text-sm text-slate-200">{selected.descricao}</p>
      {selected.solucao&&<p className="mt-3 whitespace-pre-wrap rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-100"><b>Solução registrada: </b>{selected.solucao}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {selected.status!=='EM_ATENDIMENTO'&&!['RESOLVIDO','CANCELADO'].includes(selected.status)&&<button type="button" disabled={busy||detailLoading||!!detailError} onClick={()=>void changeStatus(selected,'EM_ATENDIMENTO')} className="rounded-xl border border-white/20 px-4 py-2 text-xs">Iniciar atendimento</button>}
        {!selected.comDev&&!['RESOLVIDO','CANCELADO'].includes(selected.status)&&<button type="button" disabled={busy} onClick={()=>void changeStatus(selected,'COM_DEV')} className="rounded-xl border border-fuchsia-400/35 px-4 py-2 text-xs text-fuchsia-200">Encaminhar ao Dev</button>}
        {!['RESOLVIDO','CANCELADO'].includes(selected.status)&&<button type="button" disabled={busy} onClick={()=>void changeStatus(selected,'RESOLVIDO')} className="rounded-xl border border-emerald-400/35 px-4 py-2 text-xs text-emerald-200">Resolver OS</button>}
        {whatsappLink(selected.contatoTelefone,selected.numero)&&<a href={whatsappLink(selected.contatoTelefone,selected.numero)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-emerald-400/35 px-4 py-2 text-xs text-emerald-200"><MessageCircle size={15}/> Abrir WhatsApp</a>}
      </div>
      {selected.comDev&&!["RESOLVIDO","CANCELADO"].includes(selected.status)&&<button disabled={busy||detailLoading} className="sd-secondary" onClick={()=>void changeStatus(selected,"EM_ATENDIMENTO")}>Retornar ao suporte</button>}
      </>}
      {detailTab==="anexos"&&<section className="mt-3 rounded-md border border-white/10 p-3">
        <h4 className="text-sm font-bold">Evidências e anexos da OS</h4>
        <p className="mt-1 text-xs text-slate-400">Arquivos privados, disponíveis somente para operadores autorizados. Formatos PDF, JPG e PNG até 3 MB.</p>
        <form onSubmit={e=>void uploadEvidence(e)} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-xs">Arquivo do atendimento
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className={input} onChange={e=>setEvidence(e.target.files?.[0]||null)}/>
          </label>
          <button type="submit" disabled={!evidence||busy||detailLoading||!!detailError} className="min-h-11 rounded-xl border border-emerald-300/25 px-4 py-2 text-xs font-bold text-emerald-200 disabled:opacity-40">Anexar evidência</button>
        </form>
        <div className="mt-3 space-y-2">{attachments.map(a=><div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3 text-xs"><span>{a.nome} · {(a.tamanho/1024).toFixed(0)} KB</span><button type="button" className="font-bold text-emerald-200" onClick={()=>void downloadEvidence(a)}>Baixar</button></div>)}{!detailLoading&&!detailError&&!attachments.length&&<p className="text-xs text-slate-400">Nenhuma evidência anexada.</p>}</div>
      </section>}
      {detailTab==="historico"&&<>
      <h4 className="mt-3 font-bold">Histórico do atendimento</h4><p className="sd-muted">Até 500 eventos retornados pelo backend. Registre aqui os contatos feitos fora do sistema.</p>
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">{(selected.eventos||[]).map((event:SaasChamadoEvento)=><div key={event.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xs font-bold text-emerald-200">{event.acao.replaceAll('_',' ')} <span className="ml-2 font-normal text-slate-400">{when(event.criadoEm)} · {operators.find(u=>u.id===event.operadorId)?.nome||'Operador '+event.operadorId.slice(0,8)}</span></p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{event.mensagem}</p></div>)}</div>
      <form onSubmit={e=>void addInteraction(e)} className="mt-4"><label className="text-xs text-slate-300">Registrar atendimento feito pelo WhatsApp / contato interno<textarea required minLength={2} className={input+' min-h-24'} value={interaction} onChange={e=>setInteraction(e.target.value)} placeholder="Ex.: Cliente informou erro no PDV pelo WhatsApp. Solicitamos print..."/></label><button disabled={busy||detailLoading||!!detailError} type="submit" className="mt-3 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-[#102a21]">Registrar interação</button></form>
    </>}
    </section>}
    </div>
    {editing&&selected&&<div role="dialog" aria-modal="true" aria-label={'Editar ordem de serviço '+selected.numero} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"><form onSubmit={e=>void submitEdit(e)} className="max-h-[95dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-white/15 bg-[#17191e] p-4 sm:p-5"><div className="flex items-center justify-between"><h3 className="text-xl font-bold">Editar OS #{selected.numero}</h3><button type="button" disabled={busy} onClick={()=>setEditing(false)} aria-label="Fechar"><X/></button></div>{error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}<div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Status<select className={input} value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value as ChamadoStatus,comDev:e.target.value==='COM_DEV'?true:['RESOLVIDO','CANCELADO'].includes(e.target.value)?false:p.comDev}))}>{(Object.keys(statuses) as ChamadoStatus[]).map(k=><option value={k} key={k}>{statuses[k]}</option>)}</select></label>
      <label className="text-xs">Prioridade<select className={input} value={editForm.prioridade} onChange={e=>setEditForm(p=>({...p,prioridade:e.target.value as ChamadoPrioridade}))}>{(Object.keys(priorities) as ChamadoPrioridade[]).map(k=><option value={k} key={k}>{priorities[k]}</option>)}</select></label>
      <label className="text-xs">Responsável interno<select className={input} value={editForm.responsavelId} onChange={e=>setEditForm(p=>({...p,responsavelId:e.target.value}))}><option value="">Não atribuído</option>{operators.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
      <label className="text-xs">Categoria<select className={input} value={editForm.categoria} onChange={e=>setEditForm(p=>({...p,categoria:e.target.value as ChamadoCategoria}))}>{(Object.keys(categories) as ChamadoCategoria[]).map(k=><option value={k} key={k}>{categories[k]}</option>)}</select></label>
      <label className="text-xs sm:col-span-2"><span className="flex items-center gap-2"><input type="checkbox" checked={!!editForm.comDev} onChange={e=>setEditForm(p=>({...p,comDev:e.target.checked,status:e.target.checked?'COM_DEV':p.status==='COM_DEV'?'EM_ATENDIMENTO':p.status}))}/> Chamado encaminhado ao Dev</span></label>
      <label className="text-xs sm:col-span-2">Dev responsável (manual)<input className={input} value={editForm.devResponsavel||''} onChange={e=>setEditForm(p=>({...p,devResponsavel:e.target.value}))} placeholder="Nome do desenvolvedor ou equipe"/></label>
      <label className="text-xs sm:col-span-2">Nome do contato<input className={input} value={editForm.contatoNome||''} onChange={e=>setEditForm(p=>({...p,contatoNome:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Telefone WhatsApp (DDD + número)<input className={input} value={editForm.contatoTelefone||''} onChange={e=>setEditForm(p=>({...p,contatoTelefone:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Assunto<input required className={input} value={editForm.titulo||''} onChange={e=>setEditForm(p=>({...p,titulo:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Descrição<textarea className={input+' min-h-28'} value={editForm.descricao||''} onChange={e=>setEditForm(p=>({...p,descricao:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Solução / observação final<textarea className={input+' min-h-24'} value={editForm.solucao||''} onChange={e=>setEditForm(p=>({...p,solucao:e.target.value}))} placeholder="Obrigatório quando marcar como resolvido"/></label>
      </div><button disabled={busy} type="submit" className="rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-[#102a21]">Salvar alterações</button></form></div>}
    {newTicket&&<div role="dialog" aria-modal="true" aria-label="Nova ordem de serviço" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"><form onSubmit={e=>void submitCreate(e)} className="max-h-[95dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-white/15 bg-[#17191e] p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-emerald-300">ATENDIMENTO WHATSAPP</p><h3 className="text-xl font-bold">Nova ordem de serviço</h3></div><button type="button" disabled={busy} onClick={()=>setNewTicket(false)} aria-label="Fechar"><X/></button></div>{error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}
      <label className="block text-xs">Distribuidora<select required className={input} value={form.empresaId||''} onChange={e=>setForm(p=>({...p,empresaId:Number(e.target.value)}))}><option value="">Selecione uma distribuidora</option>{(supportCompanies.length?supportCompanies:empresas).map(c=><option value={c.id} key={c.id}>{c.nomeFantasia}</option>)}</select></label>
      <label className="block text-xs">Assunto<input required minLength={3} maxLength={160} className={input} value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex.: Erro ao finalizar venda no PDV"/></label>
      <label className="block text-xs">Descrição do problema<textarea required minLength={5} className={input+' min-h-28'} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o relato do cliente, testes realizados e informações recebidas no WhatsApp"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Nome do contato<input className={input} value={form.contatoNome} onChange={e=>setForm(p=>({...p,contatoNome:e.target.value}))}/></label><label className="text-xs">WhatsApp (DDD + número)<input className={input} value={form.contatoTelefone} onChange={e=>setForm(p=>({...p,contatoTelefone:e.target.value}))}/></label>
      <label className="text-xs">Tipo<select className={input} value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value as ChamadoCategoria}))}>{(Object.keys(categories) as ChamadoCategoria[]).map(k=><option key={k} value={k}>{categories[k]}</option>)}</select></label>
      <label className="text-xs">Prioridade<select className={input} value={form.prioridade} onChange={e=>setForm(p=>({...p,prioridade:e.target.value as ChamadoPrioridade}))}>{(Object.keys(priorities) as ChamadoPrioridade[]).map(k=><option key={k} value={k}>{priorities[k]}</option>)}</select></label>
      <label className="text-xs sm:col-span-2">Responsável pelo atendimento<select className={input} value={form.responsavelId||''} onChange={e=>setForm(p=>({...p,responsavelId:e.target.value}))}><option value="">Administrador que abriu</option>{operators.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label></div>
      <p className="text-xs text-slate-400">Os atendimentos e registros serão manuais. Nenhuma mensagem é enviada ao WhatsApp automaticamente.</p>
      <button disabled={busy} type="submit" className="rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-[#102a21]">Criar OS</button>
    </form></div>}
  </div>;
}
