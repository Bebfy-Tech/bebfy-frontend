import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Download, FilePlus2, LockKeyhole, Plus, RefreshCcw, Search, Wallet, X } from 'lucide-react';
import { saasApi } from '../services/saas';
import type { SaasCobrancaFinanceiro, SaasFinanceiroEmpresa, SaasFinanceiroEvento, SaasFinanceiroResumo, SaasAnexoFinanceiro } from '../services/saas';

const panel = 'rounded-2xl border border-white/10 bg-[#202a2e] p-5 shadow-lg';
const field = 'w-full min-h-11 rounded-xl border border-white/20 bg-[#131f23] px-4 py-3 text-sm text-white outline-none focus:border-emerald-300';
const date = (v:string) => new Date(v).toLocaleDateString('pt-BR',{timeZone:'UTC'});
const money = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const errorText=(error:unknown)=>{
  const e=error as {response?:{data?:{message?:string|string[]}};message?:string};
  const m=e.response?.data?.message??e.message;
  return Array.isArray(m)?m.join(' · '):m||'Não foi possível concluir a operação.';
};
const csvValue=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
function exportCsv(rows:unknown[][]){
  const content='\uFEFF'+rows.map(row=>row.map(csvValue).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='bebfy-financeiro.csv';a.click();
  URL.revokeObjectURL(url);
}
type Tab='geral'|'clientes'|'cobrancas'|'inadimplencia'|'relatorios';
const billStatus:Record<SaasCobrancaFinanceiro['status'],string>={
  PAGO:'Pago',VENCIDO:'Vencido',PARCIAL:'Parcial',PENDENTE:'Pendente',
};
const statusColor:Record<SaasCobrancaFinanceiro['status'],string>={
  PAGO:'bg-emerald-400/10 text-emerald-200',VENCIDO:'bg-rose-400/10 text-rose-200',
  PARCIAL:'bg-blue-400/10 text-blue-200',PENDENTE:'bg-amber-400/10 text-amber-200',
};

export function SaasFinanceiro({onOpenCompany}:{onOpenCompany:(id:number)=>void}){
  const [data,setData]=useState<SaasFinanceiroResumo|null>(null);
  const [tab,setTab]=useState<Tab>('geral');
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
  const [payment,setPayment]=useState({valor:'',pagoEm:new Date().toISOString().slice(0,10),forma:'PIX',observacao:''});
  const [days,setDays]=useState(7);
  const [reason,setReason]=useState('Prazo adicional para regularização do pagamento.');
  const refresh=useCallback(async()=>{
    try {setData(await saasApi.financeiro());setError('');}
    catch(e){setError(errorText(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const companies=data?.empresas??[];
  const bills=data?.cobrancas??[];
  const chosen=companies.find(e=>e.id===selectedId)??null;
  const customerBills=bills.filter(b=>b.empresaId===selectedId);
  const totals=useMemo(()=>bills.reduce((acc,b)=>{
    acc.previsto+=Number(b.valor);acc.recebido+=b.recebido;acc.saldo+=b.saldo;
    if(b.status==='VENCIDO')acc.vencido+=b.saldo;
    return acc;
  },{previsto:0,recebido:0,saldo:0,vencido:0}),[bills]);
  const filteredBills=bills.filter(b=>{
    const company=companies.find(e=>e.id===b.empresaId);
    const match=(company?.nomeFantasia||'').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
      ||b.referencia.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    return match&&(status==='TODOS'||b.status===status);
  });
  const clients=companies.filter(e=>e.nomeFantasia.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const perform=async(task:()=>Promise<unknown>,ok:string)=>{
    if(busy)return false;
    setBusy(true);setError('');setSuccess('');
    try{await task();await refresh();setSuccess(ok);return true;}
    catch(e){setError(errorText(e));return false;}
    finally{setBusy(false);}
  };
  const selectCustomer=async(id:number)=>{
    setSelectedId(id);setError('');setHistory([]);setAttachments([]);
    try{
      const [events,files]=await Promise.all([saasApi.historicoFinanceiro(id),saasApi.anexosFinanceiros(id)]);
      setHistory(events);setAttachments(files);
    }catch(e){setError(errorText(e));}
  };
  const addCharge=async(e:React.FormEvent)=>{
    e.preventDefault();if(!chosen)return;
    const valor=Number(charge.valor.replace(',','.'));
    if(!Number.isFinite(valor)||valor<=0){setError('Informe um valor válido.');return;}
    const saved=await perform(()=>saasApi.criarCobranca(chosen.id,{
      referencia:charge.referencia,valor,vencimento:charge.vencimento,
      linhaDigitavel:charge.linhaDigitavel,observacao:charge.observacao,
    }),'Cobrança cadastrada.');
    if(saved){setNewCharge(false);setCharge({referencia:'',valor:'',vencimento:'',linhaDigitavel:'',observacao:''});}
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
    await perform(()=>saasApi.definirInadimplencia(c.id,!c.inadimplente),
      c.inadimplente?'Bloqueio financeiro removido.':'Empresa bloqueada por inadimplência.');
    if(selectedId===c.id)void selectCustomer(c.id);
  };
  const grant=async(c:SaasFinanceiroEmpresa)=>{
    if(!Number.isInteger(days)||days<1||days>90){setError('Informe de 1 a 90 dias.');return;}
    if(reason.trim().length<8){setError('A justificativa precisa ter pelo menos 8 caracteres.');return;}
    if(!window.confirm('Liberar '+c.nomeFantasia+' por '+days+' dias?'))return;
    await perform(()=>saasApi.liberarTemporariamente(c.id,days,reason),'Liberação temporária registrada.');
    void selectCustomer(c.id);
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
      <td className="px-4 py-3 text-sm"><b>{companies.find(e=>e.id===b.empresaId)?.nomeFantasia||'#'+b.empresaId}</b><div className="mt-1 text-xs text-slate-400">{b.referencia}</div></td>
      <td className="px-4 py-3 text-sm">{money(Number(b.valor))}<div className="mt-1 text-xs text-slate-400">Saldo {money(b.saldo)}</div></td>
      <td className="px-4 py-3 text-xs text-slate-300">{date(b.vencimento)}</td>
      <td className="px-4 py-3"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+statusColor[b.status]}>{billStatus[b.status]}</span></td>
      <td className="px-4 py-3 text-right">{b.saldo>0?<button type="button" disabled={busy} className="text-xs font-bold text-emerald-300 hover:underline disabled:opacity-40" onClick={()=>{setPaying(b);setError('');setPayment(p=>({...p,valor:b.saldo.toFixed(2)}));}}>Registrar pagamento</button>:<span className="text-xs text-slate-500">Quitado</span>}</td>
    </tr>
  );
  return <div className="space-y-6 text-slate-100">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-emerald-300">GESTÃO FINANCEIRA</p><h2 className="mt-2 text-2xl font-extrabold">Financeiro e cobranças</h2><p className="mt-1 text-sm text-slate-400">Controle manual de mensalidades, pagamentos e acesso das distribuidoras.</p></div><button type="button" onClick={()=>void refresh()} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold"><RefreshCcw size={16}/> Atualizar</button></div>
    {error&&<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    {success&&<p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}
    {loading?<div className={panel}>Carregando financeiro...</div>:!data?<div className={panel}>Não foi possível carregar os dados. Confira a versão v2 do backend e as migrações.</div>:<>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([['Previsto',totals.previsto,CalendarDays],['Recebido',totals.recebido,CheckCircle2],['A receber',totals.saldo,Wallet],['Em atraso',totals.vencido,AlertTriangle]] as const).map(([title,value,Icon])=>
          <div key={title} className={panel}><div className="flex items-center justify-between text-xs text-slate-400"><span>{title}</span><Icon size={17} className="text-emerald-300"/></div><strong className="mt-4 block text-xl">{money(value)}</strong><p className="mt-2 text-xs text-slate-500">Cobranças registradas</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">{([
        ['geral','Visão geral'],['clientes','Clientes'],['cobrancas','Cobranças'],['inadimplencia','Inadimplência'],['relatorios','Relatórios'],
      ] as [Tab,string][]).map(([key,title])=><button type="button" key={key} onClick={()=>{setTab(key);setSelectedId(null);setQuery('');}} className={'rounded-xl px-4 py-2.5 text-xs font-bold '+(tab===key?'bg-emerald-300 text-[#112a24]':'bg-white/5 text-slate-300 hover:bg-white/10')}>{title}</button>)}</div>
      {selectedId&&chosen?<div className="space-y-4">
        <button type="button" onClick={()=>setSelectedId(null)} className="flex items-center gap-2 text-sm text-slate-300"><ArrowLeft size={16}/> Voltar</button>
        <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-400">FICHA FINANCEIRA</p><h3 className="mt-1 text-xl font-bold">{chosen.nomeFantasia}</h3><p className="mt-1 text-xs text-slate-400">{chosen.plano?.nome||'Sem plano'} · {chosen.slug}</p></div><button className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold" onClick={()=>onOpenCompany(chosen.id)}>Cadastro da distribuidora</button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Valor do plano</p><b>{money(Number(chosen.plano?.precoMensal||0))}/mês</b></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Saldo em aberto</p><b>{money(customerBills.reduce((v,b)=>v+b.saldo,0))}</b></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Acesso financeiro</p><b>{!chosen.inadimplente?'Regular':chosen.liberacaoFinanceiraAte&&new Date(chosen.liberacaoFinanceiraAte).getTime()>Date.now()?'Liberado temporariamente':'Bloqueado'}</b></div></div>
        </section>
        <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Boletos e cobranças</h3><p className="mt-1 text-xs text-slate-400">Registro manual; o Bebfy não emite boletos bancários.</p></div><button type="button" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-[#102a22]" onClick={()=>setNewCharge(true)}><Plus size={16}/> Nova cobrança</button></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="text-xs text-slate-400"><tr><th className="p-4">CLIENTE / REFERÊNCIA</th><th className="p-4">VALOR</th><th className="p-4">VENCIMENTO</th><th className="p-4">STATUS</th><th className="p-4">AÇÃO</th></tr></thead><tbody>{customerBills.map(renderBill)}</tbody></table>{!customerBills.length&&<p className="p-5 text-sm text-slate-400">Nenhuma cobrança cadastrada.</p>}</div>
        </section>
        <section className={panel}>
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
          <div className="mt-5 space-y-2">{attachments.map(file=><div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><p className="text-sm font-semibold">{file.nome}</p><p className="mt-1 text-xs text-slate-400">{file.tipo==='BOLETO'?'Boleto':'Comprovante'} · {(file.tamanho/1024).toFixed(0)} KB · {new Date(file.criadoEm).toLocaleDateString('pt-BR')}</p></div><button type="button" onClick={()=>void downloadDocument(file)} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold"><Download size={15}/> Baixar</button></div>)}{!attachments.length&&<p className="text-sm text-slate-400">Nenhum boleto ou comprovante anexado.</p>}</div>
        </section>
        <section className={panel}><h3 className="font-bold">Bloqueio e liberação por inadimplência</h3><p className="mt-2 text-sm text-slate-400">Bloqueio financeiro é independente da suspensão administrativa. A liberação temporária não quita dívidas.</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className={chosen.inadimplente?'text-amber-200':'text-emerald-200'}>{chosen.inadimplente?'Inadimplente':'Sem bloqueio financeiro'}</span><button type="button" disabled={busy} onClick={()=>void changeBlock(chosen)} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold">{chosen.inadimplente?'Remover bloqueio':'Bloquear por inadimplência'}</button></div>
          {chosen.inadimplente&&<div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-[180px_1fr_auto] sm:items-end"><label className="text-xs text-slate-300">Dias (1 a 90)<input type="number" min={1} max={90} className={field+' mt-2'} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><label className="text-xs text-slate-300">Justificativa<input className={field+' mt-2'} value={reason} onChange={e=>setReason(e.target.value)}/></label><button type="button" onClick={()=>void grant(chosen)} disabled={busy||reason.trim().length<8} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 font-bold text-[#102a22] disabled:opacity-40"><LockKeyhole size={15}/> Liberar acesso</button></div>}
          {chosen.liberacaoFinanceiraAte&&chosen.inadimplente&&<p className="mt-3 text-xs text-amber-200">Cortesia válida até {new Date(chosen.liberacaoFinanceiraAte).toLocaleString('pt-BR')}.</p>}
        </section>
        <section className={panel}><h3 className="font-bold">Histórico de operações</h3><div className="mt-4 space-y-2">{history.map(item=><div key={item.id} className="rounded-xl bg-white/5 p-3 text-xs"><b>{item.acao.replaceAll('_',' ')}</b><p className="mt-1 text-slate-300">{item.descricao}</p><p className="mt-1 text-slate-500">{new Date(item.criadoEm).toLocaleString('pt-BR')} · Operador {item.operadorId}</p></div>)}{!history.length&&<p className="text-sm text-slate-400">Nenhum evento financeiro registrado nesta versão.</p>}</div></section>
      </div>:<>
        {tab==='geral'&&<div className="grid gap-4 xl:grid-cols-2"><section className={panel}><h3 className="font-bold">Situação das cobranças</h3><div className="mt-5 space-y-3">{(['PAGO','PENDENTE','PARCIAL','VENCIDO'] as const).map(k=>{const n=bills.filter(b=>b.status===k).length;return <div key={k}><div className="mb-2 flex justify-between text-xs"><span>{billStatus[k]}</span><b>{n}</b></div><div className="h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-emerald-300" style={{width:(bills.length?n/bills.length*100:0)+'%'}}/></div></div>})}</div></section><section className={panel}><h3 className="font-bold">Próximos vencimentos</h3><div className="mt-4 space-y-3">{bills.filter(b=>b.saldo>0).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).slice(0,6).map(b=><button key={b.id} onClick={()=>void selectCustomer(b.empresaId)} className="flex w-full justify-between gap-3 border-b border-white/10 py-2 text-left text-sm"><span>{companies.find(e=>e.id===b.empresaId)?.nomeFantasia} <small className="block text-slate-400">{date(b.vencimento)}</small></span><b>{money(b.saldo)}</b></button>)}{!bills.some(b=>b.saldo>0)&&<p className="text-sm text-slate-400">Nenhuma cobrança em aberto.</p>}</div></section></div>}
        {tab==='clientes'&&<section className={panel}><h3 className="font-bold">Fichas financeiras das distribuidoras</h3><div className="relative mt-4"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input className={field+' pl-10'} placeholder="Pesquisar distribuidora" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="mt-4 space-y-2">{clients.map(c=><button key={c.id} onClick={()=>void selectCustomer(c.id)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-left hover:border-emerald-300/30"><div><b className="block text-sm">{c.nomeFantasia}</b><span className="text-xs text-slate-400">{c.plano?.nome||'Sem plano'} · {c.slug}</span></div><span className={'text-xs font-bold '+(c.inadimplente?'text-amber-200':'text-emerald-200')}>{c.inadimplente?'Inadimplente':'Regular'} · Abrir ficha</span></button>)}{!clients.length&&<p className="text-sm text-slate-400">Nenhuma distribuidora encontrada.</p>}</div></section>}
        {(tab==='cobrancas'||tab==='relatorios')&&<section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{tab==='relatorios'?'Relatório de contas a receber':'Todas as cobranças'}</h3><button onClick={download} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold"><Download size={16}/> Exportar CSV</button></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]"><input className={field} placeholder="Nome da empresa ou referência" value={query} onChange={e=>setQuery(e.target.value)}/><select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="TODOS">Todos os status</option>{(Object.keys(billStatus) as SaasCobrancaFinanceiro['status'][]).map(s=><option key={s} value={s}>{billStatus[s]}</option>)}</select></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="text-xs text-slate-400"><tr><th className="p-4">DISTRIBUIDORA / REFERÊNCIA</th><th className="p-4">VALOR</th><th className="p-4">VENCIMENTO</th><th className="p-4">STATUS</th><th className="p-4">AÇÃO</th></tr></thead><tbody>{filteredBills.map(renderBill)}</tbody></table>{!filteredBills.length&&<p className="p-5 text-sm text-slate-400">Nenhuma cobrança encontrada.</p>}</div></section>}
        {tab==='inadimplencia'&&<section className={panel}><h3 className="font-bold">Controle de inadimplência</h3><p className="mt-2 text-xs text-slate-400">O bloqueio depende da marcação explícita de inadimplência, não ocorre apenas pela data de vencimento.</p><div className="mt-5 space-y-2">{companies.filter(c=>c.inadimplente||bills.some(b=>b.empresaId===c.id&&b.status==='VENCIDO')).map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><b>{c.nomeFantasia}</b><p className="mt-1 text-xs text-slate-400">{c.inadimplente?'Bloqueio financeiro registrado':'Cobrança vencida · não bloqueado'}</p></div><button onClick={()=>void selectCustomer(c.id)} className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold">Gerenciar acesso</button></div>)}{!companies.some(c=>c.inadimplente||bills.some(b=>b.empresaId===c.id&&b.status==='VENCIDO'))&&<p className="text-sm text-slate-400">Nenhum atraso identificado.</p>}</div></section>}
      </>}
    </>}
    {newCharge&&chosen&&<div role="dialog" aria-modal="true" aria-label="Nova cobrança" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3"><form onSubmit={e=>void addCharge(e)} className="max-h-[93vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-[#253035] p-6"><div className="flex justify-between"><h3 className="text-xl font-bold">Nova cobrança · {chosen.nomeFantasia}</h3><button type="button" aria-label="Fechar" onClick={()=>setNewCharge(false)}><X/></button></div><label className="block text-xs">Referência<input required maxLength={120} className={field+' mt-2'} value={charge.referencia} onChange={e=>setCharge(p=>({...p,referencia:e.target.value}))}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Valor (R$)<input required className={field+' mt-2'} inputMode="decimal" value={charge.valor} onChange={e=>setCharge(p=>({...p,valor:e.target.value}))}/></label><label className="text-xs">Vencimento<input type="date" required className={field+' mt-2'} value={charge.vencimento} onChange={e=>setCharge(p=>({...p,vencimento:e.target.value}))}/></label></div><label className="block text-xs">Linha digitável do boleto (opcional)<input className={field+' mt-2'} maxLength={120} value={charge.linhaDigitavel} onChange={e=>setCharge(p=>({...p,linhaDigitavel:e.target.value}))}/></label><label className="block text-xs">Observação<textarea className={field+' mt-2'} maxLength={500} value={charge.observacao} onChange={e=>setCharge(p=>({...p,observacao:e.target.value}))}/></label><p className="text-xs text-amber-200">Registro administrativo: não emite boleto e não envia cobranças automaticamente.</p><button disabled={busy} type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#112a24]"><FilePlus2 size={16}/> Salvar cobrança</button></form></div>}
    {paying&&<div role="dialog" aria-modal="true" aria-label="Registrar pagamento" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3"><form onSubmit={e=>void addPayment(e)} className="w-full max-w-xl space-y-4 rounded-2xl border border-white/15 bg-[#253035] p-6"><div className="flex justify-between"><h3 className="text-xl font-bold">Registrar recebimento</h3><button type="button" aria-label="Fechar" onClick={()=>setPaying(null)}><X/></button></div><p className="text-sm text-slate-300">{paying.referencia} · Saldo {money(paying.saldo)}</p><label className="block text-xs">Valor recebido<input required className={field+' mt-2'} inputMode="decimal" value={payment.valor} onChange={e=>setPayment(p=>({...p,valor:e.target.value}))}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Data do recebimento<input type="date" required className={field+' mt-2'} value={payment.pagoEm} onChange={e=>setPayment(p=>({...p,pagoEm:e.target.value}))}/></label><label className="text-xs">Forma de pagamento<select className={field+' mt-2'} value={payment.forma} onChange={e=>setPayment(p=>({...p,forma:e.target.value}))}>{['PIX','BOLETO','TRANSFERENCIA','DINHEIRO','OUTRO'].map(x=><option key={x} value={x}>{x}</option>)}</select></label></div><label className="block text-xs">Observação<textarea className={field+' mt-2'} value={payment.observacao} maxLength={500} onChange={e=>setPayment(p=>({...p,observacao:e.target.value}))}/></label><p className="text-xs text-amber-200">Confirme que o dinheiro foi recebido antes de registrar. Não há integração com o banco.</p><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#112a24]"><CreditCard size={16}/> Confirmar pagamento</button></form></div>}
  </div>;
}
