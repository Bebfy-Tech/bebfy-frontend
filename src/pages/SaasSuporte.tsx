import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Code2, Filter, MessageCircle, Plus, RefreshCcw, Search, ShieldCheck, Timer, X } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasChamado, SaasChamadoEvento, CriarSaasChamado, AtualizarSaasChamado, ChamadoStatus, ChamadoCategoria, ChamadoPrioridade, EmpresaSaas } from '../services/saas';
import { saasAuthApi } from '../services/saasAuth';
import type { SaasFuncionario } from '../services/saasAuth';

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
const input='mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-[#17262b] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-300';
const panel='rounded-2xl border border-white/10 bg-[#18282c] p-5 shadow-[0_15px_50px_rgba(0,0,0,.12)]';
const defaultForm=(empresaId=0):CriarSaasChamado=>({empresaId,titulo:'',descricao:'',contatoNome:'',contatoTelefone:'',categoria:'DUVIDA',prioridade:'NORMAL'});
const errText=(err:unknown)=>{const e=err as {response?:{data?:{message?:string|string[]}};message?:string};const m=e.response?.data?.message??e.message;return Array.isArray(m)?m.join('; '):m||'Não foi possível salvar os dados.';};
const when=(d:string)=>new Date(d).toLocaleString('pt-BR');
function whatsappLink(tel:string|null,numero:number) {
  const digits=(tel||'').replace(/\D/g,'');
  if(digits.length<10)return '';
  const international=digits.startsWith('55')&&digits.length>=12?digits:'55'+digits;
  return 'https://wa.me/'+international+'?text='+encodeURIComponent('Olá! Estamos acompanhando seu chamado Bebfy #'+numero+'.');
}
export function SaasSuporte({empresas,initialCompanyId,onOpenCompany}:{empresas:EmpresaSaas[];initialCompanyId?:number|null;onOpenCompany:(id:number)=>void}) {
  const [tickets,setTickets]=useState<SaasChamado[]>([]);
  const [operators,setOperators]=useState<SaasFuncionario[]>([]);
  const [selected,setSelected]=useState<SaasChamado|null>(null);
  const [form,setForm]=useState<CriarSaasChamado>(()=>defaultForm(initialCompanyId||0));
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState<AtualizarSaasChamado>({});
  const [newTicket,setNewTicket]=useState(false);
  const [interaction,setInteraction]=useState('');
  const [statusFilter,setStatusFilter]=useState('TODOS');
  const [devFilter,setDevFilter]=useState('TODOS');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const reload=useCallback(async()=>{
    try {const rows=await saasApi.chamadosSuporte();setTickets(rows);setError('');}
    catch(e){setError(errText(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();void saasAuthApi.funcionarios().then(setOperators).catch(()=>{});},[reload]);
  const filtered=useMemo(()=>tickets.filter(t=>{
    const q=search.toLowerCase().trim();
    const matches= !q||[String(t.numero),t.titulo,t.empresa.nomeFantasia,t.contatoNome||'',t.devResponsavel||''].some(v=>v.toLowerCase().includes(q));
    return matches&&(statusFilter==='TODOS'||t.status===statusFilter)
      &&(devFilter==='TODOS'||(devFilter==='DEV' ? t.comDev : !t.comDev));
  }),[tickets,search,statusFilter,devFilter]);
  const outstanding=tickets.filter(t=>t.status!=='RESOLVIDO'&&t.status!=='CANCELADO');
  const run=async(task:()=>Promise<unknown>,success:string)=>{
    if(busy)return false;
    setBusy(true);setError('');setMessage('');
    try{await task();await reload();setMessage(success);return true;}
    catch(e){setError(errText(e));return false;}
    finally{setBusy(false);}
  };
  const open=async(t:SaasChamado)=>{
    setEditing(false);setError('');setSelected(t);setInteraction('');
    setEditForm({titulo:t.titulo,descricao:t.descricao,contatoNome:t.contatoNome||'',
      contatoTelefone:t.contatoTelefone||'',categoria:t.categoria,prioridade:t.prioridade,status:t.status,
      comDev:t.comDev,responsavelId:t.responsavelId||'',devResponsavel:t.devResponsavel||'',solucao:t.solucao||''});
    try{setSelected(await saasApi.chamadoSuporte(t.id));}catch(e){setError(errText(e));}
  };
  const submitCreate=async(e:React.FormEvent)=>{
    e.preventDefault();
    const ok=await run(()=>saasApi.criarChamadoSuporte(form),'Ordem de serviço cadastrada com sucesso.');
    if(ok){setNewTicket(false);setForm(defaultForm());}
  };
  const submitEdit=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected)return;
    if(editForm.status==='RESOLVIDO'&&!(editForm.solucao||'').trim()){setError('Descreva a solução antes de resolver o chamado.');return;}
    const ok=await run(()=>saasApi.atualizarChamadoSuporte(selected.id,editForm),'Ordem de serviço atualizada.');
    if(ok){setEditing(false);void open({...selected,...editForm} as SaasChamado);}
  };
  const addInteraction=async(e:React.FormEvent)=>{
    e.preventDefault();if(!selected||interaction.trim().length<2)return;
    const ok=await run(()=>saasApi.registrarInteracaoSuporte(selected.id,interaction.trim()),'Atendimento registrado no histórico.');
    if(ok){setInteraction('');void open(selected);}
  };
  const changeStatus=async(t:SaasChamado,status:ChamadoStatus)=>{
    if(status==='RESOLVIDO'){void open(t);setEditing(true);setEditForm(p=>({...p,status}));return;}
    const ok=await run(()=>saasApi.atualizarChamadoSuporte(t.id,{status,comDev:status==='COM_DEV'?true:status==='PENDENTE'?false:t.comDev}),'Situação alterada.');
    if(ok&&selected?.id===t.id)void open(t);
  };
  const downloadCsv=()=>{
    const columns=[['OS','Distribuidora','Título','Prioridade','Status','Com Dev','Dev responsável','Criado em'],
      ...filtered.map(t=>[String(t.numero),t.empresa.nomeFantasia,t.titulo,priorities[t.prioridade],statuses[t.status],t.comDev?'Sim':'Não',t.devResponsavel||'',when(t.criadoEm)])];
    const esc=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
    const content='\uFEFF'+columns.map(row=>row.map(esc).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='bebfy-ordens-suporte.csv';a.click();URL.revokeObjectURL(url);
  };
  return <div className="space-y-5 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-300">BEBFY / ATENDIMENTO MANUAL</p><h2 className="mt-2 text-2xl font-extrabold">Central de suporte</h2><p className="mt-1 text-sm text-slate-400">Atenda pelo WhatsApp e controle internamente cada ordem de serviço.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>void reload()} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm"><RefreshCcw size={16}/> Atualizar</button><button onClick={()=>{setNewTicket(true);setForm(defaultForm(initialCompanyId||0));setError('');}} className="flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-extrabold text-[#102a21]"><Plus size={17}/> Abrir OS</button></div>
    </div>
    {error&&<p role="alert" className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {([{name:'OS em aberto',value:outstanding.length,icon:ClipboardList},{name:'Aguardando cliente',value:tickets.filter(t=>t.status==='AGUARDANDO_CLIENTE').length,icon:Timer},{name:'Com desenvolvimento',value:outstanding.filter(t=>t.comDev).length,icon:Code2},{name:'Resolvidas',value:tickets.filter(t=>t.status==='RESOLVIDO').length,icon:ShieldCheck}] as const).map(({name,value,icon:Icon})=><div key={name} className={panel}><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{name}</span><Icon size={19} className="text-emerald-300"/></div><p className="mt-4 text-3xl font-extrabold">{value}</p></div>)}
    </div>
    <div className={panel}>
      <div className="grid gap-3 md:grid-cols-[1fr_190px_160px_auto]">
        <div className="relative"><Search size={17} className="absolute left-3 top-4 text-slate-400"/><input className={input+' mt-0 pl-10'} placeholder="Buscar OS, distribuidora ou assunto" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className={input+' mt-0'} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="TODOS">Todos os status</option>{(Object.keys(statuses) as ChamadoStatus[]).map(k=><option key={k} value={k}>{statuses[k]}</option>)}</select>
        <select className={input+' mt-0'} value={devFilter} onChange={e=>setDevFilter(e.target.value)}><option value="TODOS">Toda a equipe</option><option value="DEV">Com o Dev</option><option value="SUPORTE">Sem o Dev</option></select>
        <button type="button" onClick={downloadCsv} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm"><Filter size={16}/> CSV</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="text-xs text-slate-400"><tr><th className="p-3">OS / DISTRIBUIDORA</th><th className="p-3">ASSUNTO</th><th className="p-3">PRIORIDADE</th><th className="p-3">STATUS</th><th className="p-3">ENCAMINHAMENTO</th><th className="p-3">AÇÃO</th></tr></thead>
          <tbody>{filtered.map(t=><tr key={t.id} className="border-t border-white/10 text-sm hover:bg-white/[.035]">
            <td className="p-3"><strong>#{t.numero}</strong><div className="mt-1 max-w-[210px] truncate text-xs text-slate-400">{t.empresa.nomeFantasia}</div></td>
            <td className="max-w-[280px] p-3"><button className="text-left font-semibold text-slate-100 hover:text-emerald-300" onClick={()=>void open(t)}>{t.titulo}</button><div className="mt-1 text-xs text-slate-400">{new Date(t.criadoEm).toLocaleDateString('pt-BR')}</div></td>
            <td className="p-3"><span className={t.prioridade==='URGENTE'?'text-rose-300':t.prioridade==='ALTA'?'text-amber-300':'text-slate-300'}>{priorities[t.prioridade]}</span></td>
            <td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-semibold '+statusClass[t.status]}>{statuses[t.status]}</span></td>
            <td className="p-3">{t.comDev?<span className="text-fuchsia-200">Com Dev{t.devResponsavel?' · '+t.devResponsavel:''}</span>:<span className="text-slate-400">Suporte</span>}</td>
            <td className="p-3"><button onClick={()=>void open(t)} className="text-xs font-bold text-emerald-300">Gerenciar OS</button></td>
          </tr>)}</tbody>
        </table>
        {loading&&<p className="p-6 text-sm text-slate-400">Carregando ordens de serviço...</p>}
        {!loading&&!filtered.length&&<p className="p-6 text-sm text-slate-400">Nenhuma OS encontrada.</p>}
      </div>
    </div>
    {selected&&!editing&&<section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-emerald-300">ORDEM DE SERVIÇO #{selected.numero}</p><h3 className="mt-1 text-xl font-extrabold">{selected.titulo}</h3><p className="mt-2 text-xs text-slate-400">{selected.empresa.nomeFantasia} · Aberto em {when(selected.criadoEm)}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>onOpenCompany(selected.empresaId)} className="rounded-xl border border-white/20 px-3 py-2 text-xs">Ver distribuidora</button><button type="button" onClick={()=>setEditing(true)} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-bold text-[#102a21]">Editar OS</button><button type="button" aria-label="Fechar detalhes" onClick={()=>setSelected(null)} className="rounded-xl border border-white/15 p-2"><X size={16}/></button></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Situação</p><p className="mt-2 font-bold">{statuses[selected.status]}</p></div>
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Prioridade</p><p className="mt-2 font-bold">{priorities[selected.prioridade]}</p></div>
        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Responsável / Dev</p><p className="mt-2 text-sm font-bold">{operators.find(o=>o.id===selected.responsavelId)?.nome||'Não atribuído'} · {selected.comDev?(selected.devResponsavel||'Encaminhado ao Dev'):'Sem Dev'}</p></div>
      </div>
      <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[.035] p-4 text-sm text-slate-200">{selected.descricao}</p>
      {selected.solucao&&<p className="mt-3 whitespace-pre-wrap rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-100"><b>Solução registrada: </b>{selected.solucao}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {selected.status!=='EM_ATENDIMENTO'&&selected.status!=='RESOLVIDO'&&<button type="button" disabled={busy} onClick={()=>void changeStatus(selected,'EM_ATENDIMENTO')} className="rounded-xl border border-white/20 px-4 py-2 text-xs">Iniciar atendimento</button>}
        {!selected.comDev&&selected.status!=='RESOLVIDO'&&<button type="button" disabled={busy} onClick={()=>void changeStatus(selected,'COM_DEV')} className="rounded-xl border border-fuchsia-400/35 px-4 py-2 text-xs text-fuchsia-200">Encaminhar ao Dev</button>}
        {selected.status!=='RESOLVIDO'&&<button type="button" disabled={busy} onClick={()=>void changeStatus(selected,'RESOLVIDO')} className="rounded-xl border border-emerald-400/35 px-4 py-2 text-xs text-emerald-200">Resolver OS</button>}
        {whatsappLink(selected.contatoTelefone,selected.numero)&&<a href={whatsappLink(selected.contatoTelefone,selected.numero)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-emerald-400/35 px-4 py-2 text-xs text-emerald-200"><MessageCircle size={15}/> Abrir WhatsApp</a>}
      </div>
      <h4 className="mt-7 font-bold">Histórico do atendimento</h4>
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">{(selected.eventos||[]).map((event:SaasChamadoEvento)=><div key={event.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xs font-bold text-emerald-200">{event.acao.replaceAll('_',' ')} <span className="ml-2 font-normal text-slate-400">{when(event.criadoEm)} · {operators.find(u=>u.id===event.operadorId)?.nome||'Operador '+event.operadorId.slice(0,8)}</span></p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{event.mensagem}</p></div>)}</div>
      <form onSubmit={e=>void addInteraction(e)} className="mt-4"><label className="text-xs text-slate-300">Registrar atendimento feito pelo WhatsApp / contato interno<textarea required minLength={2} className={input+' min-h-24'} value={interaction} onChange={e=>setInteraction(e.target.value)} placeholder="Ex.: Cliente informou erro no PDV pelo WhatsApp. Solicitamos print..."/></label><button disabled={busy} type="submit" className="mt-3 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-[#102a21]">Registrar interação</button></form>
    </section>}
    {editing&&selected&&<div role="dialog" aria-modal="true" aria-label={'Editar ordem de serviço '+selected.numero} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"><form onSubmit={e=>void submitEdit(e)} className="max-h-[95dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-[#202f34] p-5 sm:p-7"><div className="flex items-center justify-between"><h3 className="text-xl font-bold">Editar OS #{selected.numero}</h3><button type="button" onClick={()=>setEditing(false)} aria-label="Fechar"><X/></button></div>{error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}<div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Status<select className={input} value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value as ChamadoStatus,comDev:e.target.value==='COM_DEV'?true:p.comDev}))}>{(Object.keys(statuses) as ChamadoStatus[]).map(k=><option value={k} key={k}>{statuses[k]}</option>)}</select></label>
      <label className="text-xs">Prioridade<select className={input} value={editForm.prioridade} onChange={e=>setEditForm(p=>({...p,prioridade:e.target.value as ChamadoPrioridade}))}>{(Object.keys(priorities) as ChamadoPrioridade[]).map(k=><option value={k} key={k}>{priorities[k]}</option>)}</select></label>
      <label className="text-xs">Responsável interno<select className={input} value={editForm.responsavelId} onChange={e=>setEditForm(p=>({...p,responsavelId:e.target.value}))}><option value="">Não atribuído</option>{operators.filter(o=>o.ativo).map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
      <label className="text-xs">Categoria<select className={input} value={editForm.categoria} onChange={e=>setEditForm(p=>({...p,categoria:e.target.value as ChamadoCategoria}))}>{(Object.keys(categories) as ChamadoCategoria[]).map(k=><option value={k} key={k}>{categories[k]}</option>)}</select></label>
      <label className="text-xs sm:col-span-2"><span className="flex items-center gap-2"><input type="checkbox" checked={!!editForm.comDev} onChange={e=>setEditForm(p=>({...p,comDev:e.target.checked,status:e.target.checked?'COM_DEV':p.status==='COM_DEV'?'EM_ATENDIMENTO':p.status}))}/> Chamado encaminhado ao Dev</span></label>
      <label className="text-xs sm:col-span-2">Dev responsável (manual)<input className={input} value={editForm.devResponsavel||''} onChange={e=>setEditForm(p=>({...p,devResponsavel:e.target.value}))} placeholder="Nome do desenvolvedor ou equipe"/></label>
      <label className="text-xs sm:col-span-2">Nome do contato<input className={input} value={editForm.contatoNome||''} onChange={e=>setEditForm(p=>({...p,contatoNome:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Telefone WhatsApp (DDD + número)<input className={input} value={editForm.contatoTelefone||''} onChange={e=>setEditForm(p=>({...p,contatoTelefone:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Assunto<input required className={input} value={editForm.titulo||''} onChange={e=>setEditForm(p=>({...p,titulo:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Descrição<textarea className={input+' min-h-28'} value={editForm.descricao||''} onChange={e=>setEditForm(p=>({...p,descricao:e.target.value}))}/></label>
      <label className="text-xs sm:col-span-2">Solução / observação final<textarea className={input+' min-h-24'} value={editForm.solucao||''} onChange={e=>setEditForm(p=>({...p,solucao:e.target.value}))} placeholder="Obrigatório quando marcar como resolvido"/></label>
      </div><button disabled={busy} type="submit" className="rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-[#102a21]">Salvar alterações</button></form></div>}
    {newTicket&&<div role="dialog" aria-modal="true" aria-label="Nova ordem de serviço" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"><form onSubmit={e=>void submitCreate(e)} className="max-h-[95dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-[#202f34] p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-emerald-300">ATENDIMENTO WHATSAPP</p><h3 className="text-xl font-bold">Nova ordem de serviço</h3></div><button type="button" onClick={()=>setNewTicket(false)} aria-label="Fechar"><X/></button></div>{error&&<p role="alert" className="text-sm text-rose-200">{error}</p>}
      <label className="block text-xs">Distribuidora<select required className={input} value={form.empresaId||''} onChange={e=>setForm(p=>({...p,empresaId:Number(e.target.value)}))}><option value="">Selecione uma distribuidora</option>{empresas.map(c=><option value={c.id} key={c.id}>{c.nomeFantasia}</option>)}</select></label>
      <label className="block text-xs">Assunto<input required minLength={3} maxLength={160} className={input} value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex.: Erro ao finalizar venda no PDV"/></label>
      <label className="block text-xs">Descrição do problema<textarea required minLength={5} className={input+' min-h-28'} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o relato do cliente, testes realizados e informações recebidas no WhatsApp"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Nome do contato<input className={input} value={form.contatoNome} onChange={e=>setForm(p=>({...p,contatoNome:e.target.value}))}/></label><label className="text-xs">WhatsApp (DDD + número)<input className={input} value={form.contatoTelefone} onChange={e=>setForm(p=>({...p,contatoTelefone:e.target.value}))}/></label>
      <label className="text-xs">Tipo<select className={input} value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value as ChamadoCategoria}))}>{(Object.keys(categories) as ChamadoCategoria[]).map(k=><option key={k} value={k}>{categories[k]}</option>)}</select></label>
      <label className="text-xs">Prioridade<select className={input} value={form.prioridade} onChange={e=>setForm(p=>({...p,prioridade:e.target.value as ChamadoPrioridade}))}>{(Object.keys(priorities) as ChamadoPrioridade[]).map(k=><option key={k} value={k}>{priorities[k]}</option>)}</select></label>
      <label className="text-xs sm:col-span-2">Responsável pelo atendimento<select className={input} value={form.responsavelId||''} onChange={e=>setForm(p=>({...p,responsavelId:e.target.value}))}><option value="">Administrador que abriu</option>{operators.filter(o=>o.ativo).map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label></div>
      <p className="text-xs text-slate-400">Os atendimentos e registros serão manuais. Nenhuma mensagem é enviada ao WhatsApp automaticamente.</p>
      <button disabled={busy} type="submit" className="rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-[#102a21]">Criar OS</button>
    </form></div>}
  </div>;
}
