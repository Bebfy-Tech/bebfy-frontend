import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, CheckCircle, CreditCard, Wallet, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Linha } from '../services/operacional';
import { btn, card, dataBR, dinheiro, Empty, input, mensagemErro, Modal, Notice, PageTitle, secondary } from '../components/ui';

type TipoConta='pagar'|'receber';
type Conta={id:string;descricao:string;categoria?:string;valor:string|number;dataVencimento:string;status:'PENDENTE'|'PAGO'|'CANCELADO'};
type Resumo={contasPagar:Array<{status:string;quantidade:number;valor:number}>;contasReceber:Array<{status:string;quantidade:number;valor:number}>;saldoPrevisto:number};
const somar=(linhas:Resumo['contasPagar'],status:string)=>linhas.filter(x=>x.status===status).reduce((s,x)=>s+Number(x.valor),0);

export function FinanceiroPage(){
  const [tipo,setTipo]=useState<TipoConta>('pagar');
  const [pagar,setPagar]=useState<Conta[]>([]);
  const [receber,setReceber]=useState<Conta[]>([]);
  const [resumo,setResumo]=useState<Resumo|null>(null);
  const [status,setStatus]=useState('TODAS');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [nova,setNova]=useState(false);
  const [descricao,setDescricao]=useState('');
  const [valor,setValor]=useState('');
  const [categoria,setCategoria]=useState('');
  const [vencimento,setVencimento]=useState('');
  const [confirmar,setConfirmar]=useState<{conta:Conta;acao:'pagar'|'receber'|'cancelar'}|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{
      const [p,r,s]=await Promise.all([
        api.get<Conta[]>('/financeiro/contas-pagar'),
        api.get<Conta[]>('/financeiro/contas-receber'),
        api.get<Resumo>('/financeiro/resumo'),
      ]);
      setPagar(p.data);setReceber(r.data);setResumo(s.data);
    }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const contas=useMemo(()=>(tipo==='pagar'?pagar:receber).filter(c=>status==='TODAS'||c.status===status),[tipo,pagar,receber,status]);
  async function criar(e:React.FormEvent){
    e.preventDefault();if(busy)return;setErro('');setBusy(true);
    try{
      await api.post('/financeiro/contas-'+tipo,{descricao,valor:Number(valor),dataVencimento:vencimento,categoria:categoria||undefined});
      setNova(false);setDescricao('');setValor('');setVencimento('');setCategoria('');setSucesso('Conta lançada com sucesso.');await load();
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  async function executar(){
    if(!confirmar||busy)return;setErro('');setBusy(true);
    const {conta,acao}=confirmar;
    try{
      await api.patch(`/financeiro/contas-${tipo}/${encodeURIComponent(conta.id)}/${acao}`);
      setConfirmar(null);setSucesso(acao==='cancelar'?'Lançamento cancelado.':'Conta liquidada.');await load();
    }catch(e){setErro(mensagemErro(e));setConfirmar(null);}finally{setBusy(false);}
  }
  return <>
    <PageTitle title="Financeiro" subtitle="Controle de contas a pagar e a receber, vencimentos e saldo previsto." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <section className="mb-5 grid gap-4 sm:grid-cols-3">
      <div className={`${card} p-5`}><ArrowUpCircle className="text-rose-600"/><p className="mt-3 text-sm text-slate-500">Contas a pagar (pendentes)</p><strong className="text-2xl">{dinheiro(somar(resumo?.contasPagar||[],'PENDENTE'))}</strong></div>
      <div className={`${card} p-5`}><ArrowDownCircle className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Contas a receber (pendentes)</p><strong className="text-2xl">{dinheiro(somar(resumo?.contasReceber||[],'PENDENTE'))}</strong></div>
      <div className={`${card} p-5`}><Wallet className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Saldo futuro estimado</p><strong className="text-2xl">{dinheiro(resumo?.saldoPrevisto)}</strong><p className="mt-1 text-xs text-slate-500">Previsão, não saldo bancário.</p></div>
    </section>
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">{(['pagar','receber'] as TipoConta[]).map(t=><button key={t} onClick={()=>{setTipo(t);setStatus('TODAS');}} className={`rounded-lg px-4 py-2.5 transition ${tipo===t?'bg-white text-teal-800 shadow-sm':'text-slate-500'}`}>{t==='pagar'?'Contas a pagar':'Contas a receber'}</button>)}</div>
        <div className="flex flex-wrap gap-2"><select aria-label="Filtrar status" value={status} onChange={e=>setStatus(e.target.value)} className={`${input} !w-auto`}><option value="TODAS">Todos</option><option value="PENDENTE">Pendentes</option><option value="PAGO">Pagos</option><option value="CANCELADO">Cancelados</option></select><button onClick={()=>setNova(true)} className={btn}><CreditCard size={17}/> Nova conta</button></div>
      </div>
      {loading?<p className="p-10 text-center text-slate-500">Carregando financeiro...</p>:
      <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Descrição</th><th className="p-4">Vencimento</th><th className="p-4">Valor</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{contas.map(c=><tr key={c.id}><td className="p-4"><strong>{c.descricao}</strong>{c.categoria&&<p className="mt-1 text-xs text-slate-400">{c.categoria}</p>}</td><td className="p-4">{dataBR(c.dataVencimento)}</td><td className="p-4 font-bold">{dinheiro(c.valor)}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${c.status==='PENDENTE'?'bg-amber-50 text-amber-700':c.status==='PAGO'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{c.status}</span></td><td className="p-4"><div className="flex justify-end gap-2">{c.status==='PENDENTE'&&<><button title="Marcar como liquidado" onClick={()=>setConfirmar({conta:c,acao:tipo})} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"><CheckCircle size={18}/></button><button title="Cancelar lançamento" onClick={()=>setConfirmar({conta:c,acao:'cancelar'})} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><XCircle size={18}/></button></>}</div></td></tr>)}</tbody></table>{!contas.length&&<div className="p-5"><Empty>Nenhuma conta encontrada para este filtro.</Empty></div>}</div>}
    </section>
    {nova&&<Modal title={tipo==='pagar'?'Nova conta a pagar':'Nova conta a receber'} onClose={()=>setNova(false)}><form onSubmit={e=>void criar(e)} className="space-y-4"><label className="block text-sm font-semibold">Descrição<input required className={`${input} mt-2`} maxLength={240} value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex.: aluguel do galpão"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Valor (R$)<input required min=".01" step=".01" type="number" className={`${input} mt-2`} value={valor} onChange={e=>setValor(e.target.value)}/></label><label className="block text-sm font-semibold">Vencimento<input required type="date" className={`${input} mt-2`} value={vencimento} onChange={e=>setVencimento(e.target.value)}/></label></div>{tipo==='pagar'&&<label className="block text-sm font-semibold">Categoria<input maxLength={80} className={`${input} mt-2`} value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ex.: despesas fixas"/></label>}
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={()=>setNova(false)}>Cancelar</button><button type="submit" disabled={busy} className={btn}><CalendarDays size={16}/>{busy?'Salvando...':'Cadastrar conta'}</button></div></form></Modal>}
    {confirmar&&<Modal title="Confirmar atualização da conta" onClose={()=>setConfirmar(null)}><p className="text-sm text-slate-600">Confirma a operação <strong>{confirmar.acao==='cancelar'?'cancelar':'liquidar'}</strong> para o lançamento abaixo? Esta ação não executa transações bancárias.</p><div className="my-5 rounded-xl bg-slate-50 p-4"><p className="font-bold">{confirmar.conta.descricao}</p><p className="mt-1 text-xl font-black">{dinheiro(confirmar.conta.valor)}</p></div><div className="flex justify-end gap-2"><button className={secondary} onClick={()=>setConfirmar(null)}>Voltar</button><button disabled={busy} className={btn} onClick={()=>void executar()}>{busy?'Atualizando...':'Confirmar'}</button></div></Modal>}
  </>;
}
