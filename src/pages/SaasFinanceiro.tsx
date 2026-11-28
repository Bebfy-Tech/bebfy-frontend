import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Download, FilePlus2, LockKeyhole, Plus, RefreshCcw, Search, Wallet, X } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasCobrancaFinanceiro, SaasFinanceiroEmpresa, SaasFinanceiroEvento, SaasFinanceiroResumo, SaasAnexoFinanceiro } from '../services/saas';

const panel = 'sc-panel sf-panel';
const field = 'saas-field sf-field w-full rounded-md border px-3 py-2 text-sm text-white outline-none focus:border-emerald-300';
const date = (v:string) => new Date(v).toLocaleDateString('pt-BR',{timeZone:'UTC'});
const money = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const errorText=(error:unknown)=>{
  const e=error as {response?:{data?:{message?:string|string[]}};message?:string};
  const m=e.response?.data?.message??e.message;
  return Array.isArray(m)?m.join(' · '):m||'Não foi possível concluir a operação.';
};
const csvValue=(v:unknown)=>{
  const raw=String(v??'');
  // Prevent spreadsheet formula injection from names and billing references.
  const safe=typeof v==='string'&&/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
};
function exportCsv(rows:unknown[][]){
  const content='\uFEFF'+rows.map(row=>row.map(csvValue).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='bebfy-financeiro.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
type Tab='geral'|'clientes'|'cobrancas'|'inadimplencia'|'relatorios';
type DetailTab='cobrancas'|'mensalidade'|'documentos'|'acesso'|'historico';
const civilToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
const centavos=(n:number)=>Math.round(Number(n)*100);
const sum=(values:number[])=>values.reduce((s,n)=>s+centavos(n),0)/100;
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const billStatus:Record<SaasCobrancaFinanceiro['status'],string>={
  PAGO:'Pago',VENCIDO:'Vencido',PARCIAL:'Parcial',PENDENTE:'Pendente',
};
const statusColor:Record<SaasCobrancaFinanceiro['status'],string>={
  PAGO:'bg-emerald-400/10 text-emerald-200',VENCIDO:'bg-rose-400/10 text-rose-200',
  PARCIAL:'bg-blue-400/10 text-blue-200',PENDENTE:'bg-amber-400/10 text-amber-200',
};

export function SaasFinanceiro({onOpenCompany,initialCompanyId}:{onOpenCompany:(id:number)=>void;initialCompanyId?:number|null}){
  const [data,setData]=useState<SaasFinanceiroResumo|null>(null);
  const [tab,setTab]=useState<Tab>('geral');
  const [detailTab,setDetailTab]=useState<DetailTab>('cobrancas');
  const [period,setPeriod]=useState('');
  const [companyFilter,setCompanyFilter]=useState('TODAS');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [detailPage,setDetailPage]=useState(1);
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState('');
  const requestSeq=useRef(0);
  const activeCompany=useRef<number|null>(null);
  const appliedInitial=useRef<number|null>(null);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [history,setHistory]=useState<SaasFinanceiroEvento[]>([]);
  const [attachments,setAttachments]=useState<SaasAnexoFinanceiro[]>([]);
  const [documentFile,setDocumentFile]=useState<File|null>(null);
  const [documentType,setDocumentType]=useState<'BOLETO'|'COMPROVANTE'>('BOLETO');
  const [documentBill,setDocumentBill]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('TODOS');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [newCharge,setNewCharge]=useState(false);
  const [charge,setCharge]=useState({referencia:'',valor:'',vencimento:'',linhaDigitavel:'',observacao:''});
  const [paying,setPaying]=useState<SaasCobrancaFinanceiro|null>(null);
  const [payment,setPayment]=useState({valor:'',pagoEm:civilToday(),forma:'PIX',observacao:''});
  const [days,setDays]=useState(7);
  const [reason,setReason]=useState('Prazo adicional para regularização do pagamento.');
  const [recurring,setRecurring]=useState(false);
  const [dueDay,setDueDay]=useState(15);
  const [competence,setCompetence]=useState(()=>civilToday().slice(0,7));
  const refresh=useCallback(async()=>{
    setLoading(true);
    try {setData(await saasApi.financeiro());setError('');}
    catch(e){setError(errorText(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const companies=data?.empresas??[];
  const bills=data?.cobrancas??[];
  const chosen=companies.find(e=>e.id===selectedId)??null;
  const customerBills=bills.filter(b=>b.empresaId===selectedId);
  const byCompany=useMemo(()=>new Map(companies.map(c=>[c.id,c])),[companies]);
  const today=civilToday(),month=today.slice(0,7);
  const periodBills=bills.filter(b=>!period||b.vencimento.slice(0,7)===period);
  // These cards describe the due-date cohort, not a cash-flow period.
  const totals={previsto:sum(periodBills.map(b=>Number(b.valor))),recebido:sum(periodBills.map(b=>b.recebido)),saldo:sum(periodBills.map(b=>b.saldo)),vencido:sum(periodBills.filter(b=>b.status==='VENCIDO').map(b=>b.saldo))};
  const paidThisMonth=sum(bills.flatMap(b=>b.pagamentos.length?b.pagamentos.filter(p=>p.pagoEm.slice(0,7)===month).map(p=>Number(p.valor)):b.pagoEm?.slice(0,7)===month?[Number(b.valor)]:[]));
  const filteredBills=periodBills.filter(b=>{
    const c=byCompany.get(b.empresaId);
    const match=normalize([c?.nomeFantasia,c?.slug,String(b.empresaId),b.referencia].filter(Boolean).join(' ')).includes(normalize(query.trim()));
    return match&&(status==='TODOS'||b.status===status)&&(companyFilter==='TODAS'||String(b.empresaId)===companyFilter);
  }).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)||a.id.localeCompare(b.id));
  const clients=companies.filter(e=>normalize(e.nomeFantasia+' '+e.slug+' '+e.id).includes(normalize(query.trim())));
  const maxPage=Math.max(1,Math.ceil(filteredBills.length/pageSize)),actualPage=Math.min(page,maxPage);
  const shownBills=filteredBills.slice((actualPage-1)*pageSize,actualPage*pageSize);
  const customerMaxPage=Math.max(1,Math.ceil(customerBills.length/10)),actualDetailPage=Math.min(detailPage,customerMaxPage);
  const soon=bills.filter(b=>b.saldo>0&&b.vencimento.slice(0,10)>=today).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const overdueByCompany=useMemo(()=>{const map=new Map<number,number>();for(const b of bills){if(b.status==='VENCIDO')map.set(b.empresaId,(map.get(b.empresaId)??0)+centavos(b.saldo));}return map;},[bills]);
  const delinquent=companies.filter(c=>c.inadimplente||overdueByCompany.has(c.id));
  const grace=(c:SaasFinanceiroEmpresa)=>Boolean(c.inadimplente&&c.liberacaoFinanceiraAte&&new Date(c.liberacaoFinanceiraAte).getTime()>Date.now());
  const accessLabel=(c:SaasFinanceiroEmpresa)=>!c.inadimplente?'Regular':grace(c)?'Cortesia vigente':'Bloqueado por dívida';
  const openDetail=useCallback(async(id:number)=>{
    const changed=activeCompany.current!==id;
    activeCompany.current=id;
    const seq=++requestSeq.current;
    setSelectedId(id);setError('');setDetailError('');setDetailLoading(true);
    if(changed){setHistory([]);setAttachments([]);setDocumentFile(null);setDocumentBill('');setDetailTab('cobrancas');setDetailPage(1);setDays(7);setReason('Prazo adicional para regularização do pagamento.');setNewCharge(false);}
    const settings=data?.empresas.find(c=>c.id===id)?.configuracaoCobrancaSaas;
    setRecurring(!!settings?.recorrente);setDueDay(settings?.diaVencimento??15);
    try{const [events,files]=await Promise.all([saasApi.historicoFinanceiro(id),saasApi.anexosFinanceiros(id)]);if(seq===requestSeq.current){setHistory(events);setAttachments(files);}}
    catch(e){if(seq===requestSeq.current)setDetailError(errorText(e));}
    finally{if(seq===requestSeq.current)setDetailLoading(false);}
  },[data]);
  useEffect(()=>{
    if(initialCompanyId&&appliedInitial.current!==initialCompanyId&&data?.empresas.some(c=>c.id===initialCompanyId)){
      appliedInitial.current=initialCompanyId;void openDetail(initialCompanyId);
    }
  },[initialCompanyId,data,openDetail]);
  const closeDetail=()=>{++requestSeq.current;activeCompany.current=null;setSelectedId(null);setHistory([]);setAttachments([]);setDocumentFile(null);setDocumentBill('');setNewCharge(false);setDetailError('');setDetailLoading(false);};
  const resetFilters=()=>{setQuery('');setStatus('TODOS');setCompanyFilter('TODAS');setPeriod('');setPage(1);};
  const perform=async(task:()=>Promise<unknown>,ok:string)=>{
    if(busy)return false;
    setBusy(true);setError('');setSuccess('');
    try{await task();await refresh();setSuccess(ok);return true;}
    catch(e){setError(errorText(e));return false;}
    finally{setBusy(false);}
  };
  const selectCustomer=openDetail;
  const addCharge=async(e:React.FormEvent)=>{
    e.preventDefault();if(!chosen)return;
    const valor=Number(charge.valor.replace(',','.'));
    if(!Number.isFinite(valor)||valor<=0){setError('Informe um valor válido.');return;}
    const saved=await perform(()=>saasApi.criarCobranca(chosen.id,{
      referencia:charge.referencia,valor,vencimento:charge.vencimento,
      linhaDigitavel:charge.linhaDigitavel,observacao:charge.observacao,
    }),'Cobrança cadastrada.');
    if(saved){setNewCharge(false);setCharge({referencia:'',valor:'',vencimento:'',linhaDigitavel:'',observacao:''});void selectCustomer(chosen.id);}
  };
  const addPayment=async(e:React.FormEvent)=>{
    e.preventDefault();if(!paying)return;
    const valor=Number(payment.valor.replace(',','.'));
    if(!Number.isFinite(valor)||valor<=0||valor>paying.saldo+.001){setError('Informe um valor positivo que não ultrapasse o saldo.');return;}
    if(!window.confirm('Confirmar o recebimento manual de '+money(valor)+'?'))return;
    const companyId=paying.empresaId;
    const saved=await perform(()=>saasApi.registrarPagamento(companyId,paying.id,{
      valor,pagoEm:payment.pagoEm,forma:payment.forma,observacao:payment.observacao,
    }),'Pagamento registrado com sucesso.');
    if(saved){setPaying(null);if(selectedId===companyId)void selectCustomer(companyId);}
  };
  const changeBlock=async(c:SaasFinanceiroEmpresa)=>{
    if(!window.confirm(c.inadimplente?'Remover o bloqueio financeiro desta empresa?':'Bloquear o acesso desta distribuidora por inadimplência?'))return;
    const ok=await perform(()=>saasApi.definirInadimplencia(c.id,!c.inadimplente),
      c.inadimplente?'Bloqueio financeiro removido.':'Empresa bloqueada por inadimplência.');
    if(ok&&selectedId===c.id)void selectCustomer(c.id);
  };
  const grant=async(c:SaasFinanceiroEmpresa)=>{
    if(!Number.isInteger(days)||days<1||days>90){setError('Informe de 1 a 90 dias.');return;}
    if(reason.trim().length<8){setError('A justificativa precisa ter pelo menos 8 caracteres.');return;}
    if(!window.confirm('Liberar '+c.nomeFantasia+' por '+days+' dias?'))return;
    const ok=await perform(()=>saasApi.liberarTemporariamente(c.id,days,reason),'Liberação temporária registrada.');
    if(ok)void selectCustomer(c.id);
  };
  const configureRecurring=async()=>{
    if(!chosen)return;
    if(!Number.isInteger(dueDay)||dueDay<1||dueDay>28){setError('Escolha um dia entre 1 e 28.');return;}
    const ok=await perform(()=>saasApi.configurarRecorrencia(chosen.id,{recorrente:recurring,diaVencimento:dueDay}),
      'Configuração mensal atualizada.');
    if(ok){setRecurring(recurring);setDueDay(dueDay);}
  };
  const generateMonthly=async()=>{
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competence)){setError('Informe uma competência no formato AAAA-MM.');return;}
    if(!window.confirm('Gerar as mensalidades de '+competence+' somente para distribuidoras ativas com recorrência habilitada?'))return;
    if(busy)return;setBusy(true);setError('');setSuccess('');
    try{
      const result=await saasApi.gerarMensalidades(competence);
      await refresh();
      setSuccess(result.geradas+' mensalidade(s) criada(s); '+result.ignoradas+' ignorada(s). Nenhum boleto bancário foi emitido.');
    }catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  };

  const uploadDocument=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!chosen||!documentFile)return;
    if(documentFile.size>2*1024*1024){setError('Escolha um arquivo de até 2 MB.');return;}
    const saved=await perform(()=>saasApi.anexarFinanceiro(
      chosen.id,documentFile,documentType,documentBill||undefined,
    ),'Documento anexado à ficha financeira.');
    if(saved){setDocumentFile(null);setDocumentBill('');void selectCustomer(chosen.id);}
  };
  const downloadDocument=async(file:SaasAnexoFinanceiro)=>{
    setError('');
    try{
      const blob=await saasApi.baixarAnexoFinanceiro(file.empresaId,file.id);
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=file.nome;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(errorText(e));}
  };
  const download=()=>exportCsv([
    ['Empresa','Referência','Valor','Recebido','Saldo','Vencimento','Situação'],
    ...filteredBills.map(b=>[companies.find(e=>e.id===b.empresaId)?.nomeFantasia||'',b.referencia,
      b.valor,b.recebido,b.saldo,date(b.vencimento),billStatus[b.status]]),
  ]);
  const renderBill=(b:SaasCobrancaFinanceiro)=>(
    <tr key={b.id} className="border-t border-white/10 hover:bg-white/[.025]">
      <td className="px-4 py-3 text-sm"><button type="button" disabled={busy} className="text-left font-bold text-emerald-300 hover:underline" onClick={()=>void selectCustomer(b.empresaId)}>{byCompany.get(b.empresaId)?.nomeFantasia||'#'+b.empresaId}</button><div className="mt-1 text-xs text-slate-400">{b.referencia}</div></td>
      <td className="px-4 py-3 text-sm">{money(Number(b.valor))}</td><td className="px-4 py-3 text-sm">{money(b.recebido)}</td><td className="px-4 py-3 text-sm font-bold">{money(b.saldo)}</td>
      <td className="px-4 py-3 text-xs text-slate-300">{date(b.vencimento)}</td>
      <td className="px-4 py-3"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+statusColor[b.status]}>{billStatus[b.status]}</span></td>
      <td className="px-4 py-3 text-right">{b.saldo>0?<button type="button" disabled={busy} className="text-xs font-bold text-emerald-300 hover:underline disabled:opacity-40" onClick={()=>{setPaying(b);setError('');setPayment({valor:b.saldo.toFixed(2),pagoEm:civilToday(),forma:'PIX',observacao:''});}}>Registrar pagamento</button>:<span className="text-xs text-slate-500">Quitado</span>}</td>
    </tr>
  );
  const tableHead=<thead><tr><th>Distribuidora / referência</th><th>Valor</th><th>Recebido</th><th>Saldo</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead>;
  return <div className="sc-page sf-page text-slate-100">
    <div className="sd-heading"><div><h2>Financeiro e cobranças</h2><p>Mensalidades, recebimentos e controle manual de acesso.</p></div><div className="sd-actions"><button type="button" disabled={busy||loading} onClick={()=>void refresh()} className="sd-secondary"><RefreshCcw size={16}/> Atualizar</button><button className="sd-primary" disabled={busy||!data} onClick={()=>{closeDetail();setTab('clientes');resetFilters();}}><Plus size={16}/> Nova cobrança</button></div></div>
    {error&&<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    {success&&<p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}
    {loading?<div className={panel}>Carregando financeiro...</div>:!data?<div className={panel}>Não foi possível carregar os dados. Confira a versão v2 do backend e as migrações.</div>:<>
      <div className="sd-kpis">
        {([['Valor das cobranças',totals.previsto,CalendarDays],['Recebido dessas cobranças',totals.recebido,CheckCircle2],['Saldo a receber',totals.saldo,Wallet],['Saldo em atraso',totals.vencido,AlertTriangle]] as const).map(([title,value,Icon],i)=>
          <div key={title} className="sd-panel sd-kpi"><span className={'sd-icon '+(i===3?'red':'green')}><Icon size={22}/></span><div><small>{title}</small><strong>{money(value)}</strong><span>{period?'Vencimentos de '+period:'Todos os vencimentos'}</span></div></div>)}
      </div>
      <nav className="sc-tabs" aria-label="Seções financeiras">{([['geral','Visão geral'],['clientes','Clientes'],['cobrancas','Cobranças'],['inadimplencia','Inadimplência'],['relatorios','Relatórios']] as [Tab,string][]).map(([key,title])=><button type="button" disabled={busy} key={key} aria-pressed={tab===key&&!selectedId} onClick={()=>{closeDetail();setTab(key);resetFilters();}}>{title}</button>)}</nav>
      {selectedId&&chosen?<div className="space-y-4">
        <button type="button" disabled={busy} onClick={closeDetail} className="flex items-center gap-2 text-sm text-slate-300"><ArrowLeft size={16}/> Voltar</button>
        <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-400">FICHA FINANCEIRA</p><h3 className="mt-1 text-xl font-bold">{chosen.nomeFantasia}</h3><p className="mt-1 text-xs text-slate-400">{chosen.plano?.nome||'Sem plano'} · {chosen.slug}</p></div><button className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold" onClick={()=>onOpenCompany(chosen.id)}>Cadastro da distribuidora</button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Valor do plano</p><b>{money(Number(chosen.plano?.precoMensal||0))}/mês</b></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Saldo em aberto</p><b>{money(sum(customerBills.map(b=>b.saldo)))}</b></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Acesso financeiro</p><b>{accessLabel(chosen)}</b></div></div>
        </section>
        <nav className="sc-tabs" aria-label="Ficha financeira">{([["cobrancas","Cobranças"],["mensalidade","Mensalidade"],["documentos","Documentos"],["acesso","Acesso"],["historico","Histórico"]] as [DetailTab,string][]).map(([key,title])=><button key={key} disabled={busy} aria-pressed={detailTab===key} onClick={()=>setDetailTab(key)}>{title}</button>)}</nav>
        {detailError&&<p role="alert" className="sd-warning">{detailError}</p>}
        {detailTab==="mensalidade"&&<section className={panel}>
          <h3 className="font-bold">Configuração de mensalidade recorrente</h3>
          <p className="mt-1 text-xs text-slate-400">O lançamento mensal só será preparado ao utilizar a ação Gerar mensalidades. Desativado por padrão para evitar cobranças não autorizadas.</p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/> Habilitar geração mensal</label>
            <label className="text-xs">Dia de vencimento (1–28)<input type="number" min={1} max={28} className={field+' mt-1 w-28'} value={dueDay} onChange={e=>setDueDay(Number(e.target.value))}/></label>
            <button type="button" disabled={busy} onClick={()=>void configureRecurring()} className="min-h-11 rounded-xl border border-emerald-300/30 px-4 py-2 text-xs font-bold text-emerald-200">Salvar regra mensal</button>
          </div>
        </section>}
        {detailTab==="cobrancas"&&<section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Boletos e cobranças</h3><p className="mt-1 text-xs text-slate-400">Registro manual; o Bebfy não emite boletos bancários.</p></div><button type="button" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-[#102a22]" disabled={busy} onClick={()=>{setCharge({referencia:"",valor:"",vencimento:"",linhaDigitavel:"",observacao:""});setNewCharge(true);}}><Plus size={16}/> Nova cobrança</button></div>
          <div className="sc-table-scroll mt-3"><table className="sc-table">{tableHead}<tbody>{customerBills.slice((actualDetailPage-1)*10,actualDetailPage*10).map(renderBill)}</tbody></table>{!customerBills.length&&<p className="sd-empty">Nenhuma cobrança cadastrada.</p>}</div>
          <div className="sc-pagination mt-3"><span>Página {actualDetailPage} de {customerMaxPage} · {customerBills.length} cobrança(s)</span><div className="sd-actions"><button className="sd-secondary" disabled={busy||actualDetailPage<=1} onClick={()=>setDetailPage(actualDetailPage-1)}>Anterior</button><button className="sd-secondary" disabled={busy||actualDetailPage>=customerMaxPage} onClick={()=>setDetailPage(actualDetailPage+1)}>Próxima</button></div></div>
          <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
            <h4 className="text-sm font-bold">Histórico de recebimentos</h4>
            {customerBills.flatMap(b=>b.pagamentos.map(p=>({b,p}))).sort((a,b)=>b.p.pagoEm.localeCompare(a.p.pagoEm)).map(({b,p})=>
              <div key={p.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-white/[.035] p-3 text-xs">
                <span><b>{money(Number(p.valor))}</b> · {p.forma} <span className="block pt-1 text-slate-400">{b.referencia}</span></span>
                <span className="text-slate-400">{date(p.pagoEm)} · Operador {p.operadorId}</span>
              </div>
            )}
            {!customerBills.some(b=>b.pagamentos.length>0)&&<p className="text-xs text-slate-400">Sem lançamentos detalhados. Cobranças antigas marcadas como pagas continuam contabilizadas.</p>}
          </div>
        </section>}
        {detailTab==="documentos"&&<section className={panel}>
          <div className="flex items-center gap-2"><FilePlus2 size={20} className="text-emerald-300"/><h3 className="font-bold">Boletos e comprovantes anexados</h3></div>
          <p className="mt-2 text-xs text-slate-400">Anexe documentos PDF, JPG ou PNG de até 2 MB. Arquivos privados, disponíveis apenas para administradores autorizados.</p>
          <form onSubmit={e=>void uploadDocument(e)} className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Tipo de documento
              <select className={field+' mt-2'} value={documentType} onChange={e=>setDocumentType(e.target.value as 'BOLETO'|'COMPROVANTE')}>
                <option value="BOLETO">Boleto emitido</option><option value="COMPROVANTE">Comprovante de pagamento</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">Vincular a cobrança (opcional)
              <select className={field+' mt-2'} value={documentBill} onChange={e=>setDocumentBill(e.target.value)}>
                <option value="">Nenhuma cobrança específica</option>
                {customerBills.map(b=><option key={b.id} value={b.id}>{b.referencia} · {money(Number(b.valor))}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300 sm:col-span-2">Arquivo
              <input type="file" className={field+' mt-2'} accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required
                onChange={e=>setDocumentFile(e.target.files?.[0]??null)}/>
            </label>
            <div className="sm:col-span-2"><button type="submit" disabled={busy||!documentFile} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-bold text-[#112a24] disabled:opacity-40">Adicionar documento</button></div>
          </form>
          <div className="mt-5 space-y-2">{attachments.map(file=><div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><p className="text-sm font-semibold">{file.nome}</p><p className="mt-1 text-xs text-slate-400">{file.tipo==='BOLETO'?'Boleto':'Comprovante'} · {(file.tamanho/1024).toFixed(0)} KB · {new Date(file.criadoEm).toLocaleDateString('pt-BR')}</p></div><button type="button" onClick={()=>void downloadDocument(file)} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold"><Download size={15}/> Baixar</button></div>)}{detailLoading?<p className="sd-muted">Carregando documentos…</p>:!detailError&&!attachments.length?<p className="sd-muted">Nenhum boleto ou comprovante anexado.</p>:null}</div>
        </section>}
        {detailTab==="acesso"&&<section className={panel}><h3 className="font-bold">Bloqueio e liberação por inadimplência</h3><p className="mt-2 text-sm text-slate-400">Bloqueio financeiro é independente da suspensão administrativa. A liberação temporária não quita dívidas.</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className={chosen.inadimplente?'text-amber-200':'text-emerald-200'}>{chosen.inadimplente?'Inadimplente':'Sem bloqueio financeiro'}</span><button type="button" disabled={busy} onClick={()=>void changeBlock(chosen)} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold">{chosen.inadimplente?'Remover bloqueio':'Bloquear por inadimplência'}</button></div>
          {chosen.inadimplente&&<div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-[180px_1fr_auto] sm:items-end"><label className="text-xs text-slate-300">Dias (1 a 90)<input type="number" min={1} max={90} className={field+' mt-2'} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><label className="text-xs text-slate-300">Justificativa<input className={field+' mt-2'} value={reason} onChange={e=>setReason(e.target.value)}/></label><button type="button" onClick={()=>void grant(chosen)} disabled={busy||reason.trim().length<8||!["ATIVA","EM_TESTE"].includes(chosen.status)} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 font-bold text-[#102a22] disabled:opacity-40"><LockKeyhole size={15}/> Liberar acesso</button></div>}
          {grace(chosen)&&chosen.liberacaoFinanceiraAte&&<p className="mt-3 text-xs text-amber-200">Cortesia válida até {new Date(chosen.liberacaoFinanceiraAte).toLocaleString('pt-BR')}.</p>}
        </section>}
        {detailTab==="historico"&&<section className={panel}><h3 className="font-bold">Histórico de operações</h3><div className="mt-4 space-y-2">{history.map(item=><div key={item.id} className="rounded-xl bg-white/5 p-3 text-xs"><b>{item.acao.replaceAll('_',' ')}</b><p className="mt-1 text-slate-300">{item.descricao}</p><p className="mt-1 text-slate-500">{new Date(item.criadoEm).toLocaleString('pt-BR')} · Operador {item.operadorId}</p></div>)}{detailLoading?<p className="sd-muted">Carregando histórico…</p>:!detailError&&!history.length?<p className="sd-muted">Nenhum evento financeiro registrado.</p>:null}</div></section>}
      </div>:<>
        {(tab==='geral'||tab==='cobrancas'||tab==='relatorios')&&<>
        <section className="sc-panel"><div className="sc-filters">
          <label className="sd-search sc-query"><Search size={16}/><input aria-label="Pesquisar cobranças" placeholder="Distribuidora, código ou referência" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>
          <label>Mês de vencimento<input type="month" className={field} value={period} onChange={e=>{setPeriod(e.target.value);setPage(1);}}/></label>
          <label>Distribuidora<select value={companyFilter} onChange={e=>{setCompanyFilter(e.target.value);setPage(1);}}><option value="TODAS">Todas</option>{companies.map(c=><option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}</select></label>
          <label>Situação<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="TODOS">Todos</option>{Object.entries(billStatus).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <button className="sd-secondary" onClick={resetFilters}>Limpar</button></div><p className="sd-muted mt-2">Os indicadores superiores consideram o mês de vencimento selecionado; os demais filtros são aplicados à listagem.</p></section>
        <section className="sc-panel sc-list"><div className="sd-panel-head"><h3>{tab==='relatorios'?'Relatório de contas a receber':'Controle de cobranças'} · {filteredBills.length} registro(s)</h3><button className="sd-secondary" disabled={busy} onClick={download}><Download size={16}/> Exportar CSV</button></div><div className="sc-table-scroll"><table className="sc-table sf-table">{tableHead}<tbody>{shownBills.map(renderBill)}</tbody></table>{!filteredBills.length&&<p className="sd-empty">Nenhuma cobrança encontrada.</p>}</div><footer className="sc-pagination"><label>Por página <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><span>Página {actualPage} de {maxPage}</span><div className="sd-actions"><button className="sd-secondary" disabled={busy||actualPage<=1} onClick={()=>setPage(actualPage-1)}>Anterior</button><button className="sd-secondary" disabled={busy||actualPage>=maxPage} onClick={()=>setPage(actualPage+1)}>Próxima</button></div></footer></section>
        </>}
        {tab==='geral'&&<>
          <div className="sf-bottom">
            <section className="sc-panel"><h3>Controle de acesso</h3><dl className="sc-dl"><dt>Empresas inadimplentes</dt><dd>{companies.filter(c=>c.inadimplente).length}</dd><dt>Bloqueadas por dívida</dt><dd>{companies.filter(c=>c.inadimplente&&!grace(c)).length}</dd><dt>Cortesias vigentes</dt><dd>{companies.filter(grace).length}</dd></dl><button className="sd-link" onClick={()=>{setTab('inadimplencia');resetFilters();}}>Gerenciar inadimplência</button></section>
            <section className="sc-panel"><h3>Resumo financeiro</h3><dl className="sc-dl"><dt>Recebido no mês atual (data de pagamento)</dt><dd>{money(paidThisMonth)}</dd><dt>Saldo total em aberto</dt><dd>{money(sum(bills.map(b=>b.saldo)))}</dd><dt>Saldo vencido total</dt><dd>{money(sum(bills.filter(b=>b.status==='VENCIDO').map(b=>b.saldo)))}</dd></dl><p className="sd-muted">Recebimentos registrados manualmente, sem conciliação bancária.</p></section>
            <section className="sc-panel"><h3>Próximos vencimentos</h3><div className="sf-due">{soon.slice(0,5).map(b=><button key={b.id} disabled={busy} onClick={()=>void selectCustomer(b.empresaId)}><span><strong>{byCompany.get(b.empresaId)?.nomeFantasia||'#'+b.empresaId}</strong><small>{date(b.vencimento)}</small></span><b>{money(b.saldo)}</b></button>)}{!soon.length&&<p className="sd-empty">Nenhum vencimento futuro em aberto.</p>}</div></section>
          </div>
          <section className="sc-panel"><div className="sd-panel-head"><div><h3>Preparar mensalidades recorrentes</h3><p className="sd-muted">Geração assistida: apenas empresas ativas com recorrência habilitada e plano com valor positivo. Não emite boleto.</p></div><div className="sd-actions"><label className="sd-muted">Competência<input type="month" className={field} value={competence} onChange={e=>setCompetence(e.target.value)}/></label><button type="button" disabled={busy} onClick={()=>void generateMonthly()} className="sd-primary">Gerar mensalidades do mês</button></div></div></section>
        </>}
        {tab==='clientes'&&<section className="sc-panel"><div className="sd-panel-head"><h3>Fichas financeiras das distribuidoras</h3><span className="sd-muted">Selecione uma empresa para registrar cobrança ou pagamento.</span></div><label className="sd-search"><Search size={16}/><input aria-label="Pesquisar distribuidora" placeholder="Nome, domínio ou código" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="sc-table-scroll"><table className="sc-table"><thead><tr><th>Distribuidora</th><th>Plano</th><th>Mensalidade</th><th>Acesso financeiro</th><th>Ação</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td><strong>{c.nomeFantasia}</strong><small>#{c.id} · {c.slug}</small></td><td>{c.plano?.nome||'Sem plano'}</td><td>{c.plano?money(Number(c.plano.precoMensal)):'—'}</td><td>{accessLabel(c)}</td><td><button className="sd-link" disabled={busy} onClick={()=>void selectCustomer(c.id)}>Abrir ficha</button></td></tr>)}</tbody></table>{!clients.length&&<p className="sd-empty">Nenhuma distribuidora encontrada.</p>}</div></section>}
        {tab==='inadimplencia'&&<section className="sc-panel"><h3>Controle de inadimplência</h3><p className="sd-muted mt-2">Cobrança vencida não bloqueia automaticamente o acesso. A marcação explícita controla a restrição financeira.</p><label className="sd-search"><Search size={16}/><input aria-label="Pesquisar inadimplência" placeholder="Pesquisar distribuidora" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="sc-table-scroll"><table className="sc-table"><thead><tr><th>Distribuidora</th><th>Saldo vencido</th><th>Situação financeira</th><th>Cortesia até</th><th>Ação</th></tr></thead><tbody>{delinquent.filter(c=>normalize(c.nomeFantasia+' '+c.slug).includes(normalize(query))).map(c=><tr key={c.id}><td><strong>{c.nomeFantasia}</strong><small>#{c.id}</small></td><td>{money((overdueByCompany.get(c.id)??0)/100)}</td><td>{accessLabel(c)}</td><td>{grace(c)&&c.liberacaoFinanceiraAte?new Date(c.liberacaoFinanceiraAte).toLocaleString('pt-BR'):'—'}</td><td><button className="sd-link" disabled={busy} onClick={()=>{void selectCustomer(c.id);setDetailTab('acesso');}}>Gerenciar acesso</button></td></tr>)}</tbody></table>{!delinquent.length&&<p className="sd-empty">Nenhum atraso identificado.</p>}</div></section>}

      </>}
    </>}
    {newCharge&&chosen&&<div role="dialog" aria-modal="true" aria-label="Nova cobrança" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3"><form onSubmit={e=>void addCharge(e)} className="max-h-[93vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-[#253035] p-6"><div className="flex justify-between"><h3 className="text-xl font-bold">Nova cobrança · {chosen.nomeFantasia}</h3><button type="button" aria-label="Fechar" disabled={busy} onClick={()=>setNewCharge(false)}><X/></button></div>{error&&<p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}<label className="block text-xs">Referência<input required maxLength={120} className={field+' mt-2'} value={charge.referencia} onChange={e=>setCharge(p=>({...p,referencia:e.target.value}))}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Valor (R$)<input required className={field+' mt-2'} inputMode="decimal" value={charge.valor} onChange={e=>setCharge(p=>({...p,valor:e.target.value}))}/></label><label className="text-xs">Vencimento<input type="date" required className={field+' mt-2'} value={charge.vencimento} onChange={e=>setCharge(p=>({...p,vencimento:e.target.value}))}/></label></div><label className="block text-xs">Linha digitável do boleto (opcional)<input className={field+' mt-2'} maxLength={120} value={charge.linhaDigitavel} onChange={e=>setCharge(p=>({...p,linhaDigitavel:e.target.value}))}/></label><label className="block text-xs">Observação<textarea className={field+' mt-2'} maxLength={500} value={charge.observacao} onChange={e=>setCharge(p=>({...p,observacao:e.target.value}))}/></label><p className="text-xs text-amber-200">Registro administrativo: não emite boleto e não envia cobranças automaticamente.</p><button disabled={busy} type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#112a24]"><FilePlus2 size={16}/> Salvar cobrança</button></form></div>}
    {paying&&<div role="dialog" aria-modal="true" aria-label="Registrar pagamento" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3"><form onSubmit={e=>void addPayment(e)} className="w-full max-w-xl space-y-4 rounded-2xl border border-white/15 bg-[#253035] p-6"><div className="flex justify-between"><h3 className="text-xl font-bold">Registrar recebimento</h3><button type="button" aria-label="Fechar" disabled={busy} onClick={()=>setPaying(null)}><X/></button></div>{error&&<p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}<p className="text-sm text-slate-300">{paying.referencia} · Saldo {money(paying.saldo)}</p><label className="block text-xs">Valor recebido<input required className={field+' mt-2'} inputMode="decimal" value={payment.valor} onChange={e=>setPayment(p=>({...p,valor:e.target.value}))}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Data do recebimento<input type="date" max={civilToday()} required className={field+' mt-2'} value={payment.pagoEm} onChange={e=>setPayment(p=>({...p,pagoEm:e.target.value}))}/></label><label className="text-xs">Forma de pagamento<select className={field+' mt-2'} value={payment.forma} onChange={e=>setPayment(p=>({...p,forma:e.target.value}))}>{['PIX','BOLETO','TRANSFERENCIA','DINHEIRO','OUTRO'].map(x=><option key={x} value={x}>{x}</option>)}</select></label></div><label className="block text-xs">Observação<textarea className={field+' mt-2'} value={payment.observacao} maxLength={500} onChange={e=>setPayment(p=>({...p,observacao:e.target.value}))}/></label><p className="text-xs text-amber-200">Confirme que o dinheiro foi recebido antes de registrar. Não há integração com o banco.</p><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#112a24]"><CreditCard size={16}/> Confirmar pagamento</button></form></div>}
  </div>;
}
