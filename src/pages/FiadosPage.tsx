import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Search } from 'lucide-react';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Caixa, Cliente } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { btn, card, dataBR, dinheiro, Empty, input, mensagemErro, Modal, Notice, PageTitle, secondary } from '../components/ui';

export function FiadosPage(){
  const [clientes,setClientes]=useState<Cliente[]>([]);
  const [caixas,setCaixas]=useState<Caixa[]>([]);
  const [caixaId,setCaixaId]=useState('');
  const [historico,setHistorico]=useState<Linha[]>([]);
  const [busca,setBusca]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [tipo,setTipo]=useState<'DEBITO'|'CREDITO'>('DEBITO');
  const [modal,setModal]=useState(false);
  const [clienteId,setClienteId]=useState('');
  const [valor,setValor]=useState('');
  const [descricao,setDescricao]=useState('');
  const [forma,setForma]=useState('DINHEIRO');
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{
      const [c,h,cx]=await Promise.all([bebfy.clientes.listar(),api.get<Linha[]>('/fiados'),bebfy.caixa.listar().catch(()=>[])]);setClientes(c);setHistorico(h.data);setCaixas(cx.filter(x=>x.status==='ABERTO'));
    }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const filtrados=useMemo(()=>clientes.filter(c=>c.nome.toLowerCase().includes(busca.toLowerCase())),[clientes,busca]);
  function abrir(t:'DEBITO'|'CREDITO',cliente?:Cliente){setTipo(t);setClienteId(cliente?.id||'');setModal(true);setValor('');setDescricao('');setCaixaId('');setErro('');}
  async function registrar(e:React.FormEvent){
    e.preventDefault();if(busy||!clienteId)return;setBusy(true);setErro('');
    try{
      if(tipo==='CREDITO')await api.post('/fiados/pagar/'+encodeURIComponent(clienteId),{valor:Number(valor),formaPagamento:forma,...(caixaId?{caixaId}:{})});
      else await api.post('/fiados',{clienteId,tipo:'DEBITO',valor:Number(valor),descricao});
      setModal(false);setSucesso(tipo==='CREDITO'?'Pagamento registrado.':'Débito registrado.');await load();
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  const total=clientes.reduce((s,c)=>s+Number(c.saldoDevedor),0);
  return <>
    <PageTitle title="Fiados e recebimentos" subtitle="Controle limites, pagamentos parciais e saldos de clientes." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <section className="mb-5 grid gap-4 sm:grid-cols-3"><div className={`${card} p-5`}><HandCoins size={24} className="text-amber-600"/><p className="mt-3 text-sm text-slate-500">Valor total a receber</p><strong className="text-2xl">{dinheiro(total)}</strong></div><div className={`${card} p-5`}><p className="text-sm text-slate-500">Clientes com débito</p><strong className="mt-3 block text-3xl">{clientes.filter(c=>Number(c.saldoDevedor)>0).length}</strong></div><div className={`${card} p-5`}><p className="text-sm text-slate-500">Movimentações</p><strong className="mt-3 block text-3xl">{historico.length}</strong></div></section>
    <div className="mb-5 flex flex-wrap gap-3"><button className={btn} onClick={()=>abrir('DEBITO')}><ArrowUpCircle size={18}/> Lançar débito</button><button className={secondary} onClick={()=>abrir('CREDITO')}><ArrowDownCircle size={18}/> Registrar recebimento</button></div>
    <section className={`${card} mb-5 overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="font-bold">Saldos por cliente</h2><div className="relative w-full sm:w-72"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input className={`${input} pl-10`} placeholder="Buscar cliente" value={busca} onChange={e=>setBusca(e.target.value)}/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">Cliente</th><th className="p-4">Limite</th><th className="p-4">Saldo devedor</th><th className="p-4">Cascos</th><th className="p-4 text-right">Receber</th></tr></thead><tbody className="divide-y divide-slate-100">{filtrados.map(c=><tr key={c.id}><td className="p-4 font-semibold">{c.nome}</td><td className="p-4">{dinheiro(c.limiteCredito)}</td><td className="p-4 font-bold text-amber-700">{dinheiro(c.saldoDevedor)}</td><td className="p-4">{c.cascosEmPosse}</td><td className="p-4 text-right"><button disabled={Number(c.saldoDevedor)<=0} onClick={()=>abrir('CREDITO',c)} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 disabled:opacity-30">Receber</button></td></tr>)}</tbody></table>{!loading&&filtrados.length===0&&<div className="p-5"><Empty>Sem clientes cadastrados.</Empty></div>}</div></section>
    <section className={`${card} overflow-hidden`}><h2 className="border-b border-slate-100 p-5 font-bold">Histórico de fiados</h2><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Movimento</th><th className="p-4">Valor</th><th className="p-4">Saldo após</th></tr></thead><tbody className="divide-y divide-slate-100">{historico.map(h=><tr key={String(h.id)}><td className="p-4">{dataBR(h.criadoEm)}</td><td className="p-4">{String((h.cliente as Linha|undefined)?.nome||'—')}</td><td className="p-4">{h.tipo==='DEBITO'?'Débito':'Crédito'}</td><td className="p-4 font-bold">{dinheiro(h.valor)}</td><td className="p-4">{dinheiro(h.saldoApos)}</td></tr>)}</tbody></table>{!loading&&!historico.length&&<div className="p-5"><Empty>Nenhuma movimentação de fiado.</Empty></div>}</div></section>
    {modal&&<Modal title={tipo==='DEBITO'?'Lançar débito de fiado':'Receber pagamento de fiado'} onClose={()=>setModal(false)}><form onSubmit={e=>void registrar(e)} className="space-y-4"><label className="block text-sm font-semibold">Cliente<select required value={clienteId} className={`${input} mt-2`} onChange={e=>setClienteId(e.target.value)}><option value="">Selecione...</option>{clientes.filter(c=>c.ativo).map(c=><option key={c.id} value={c.id}>{c.nome} · Saldo {dinheiro(c.saldoDevedor)}</option>)}</select></label>
      <label className="block text-sm font-semibold">Valor (R$)<input type="number" required min=".01" step=".01" className={`${input} mt-2`} value={valor} onChange={e=>setValor(e.target.value)}/></label>
      {tipo==='DEBITO'?<label className="block text-sm font-semibold">Motivo<input className={`${input} mt-2`} value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex.: ajuste ou venda anterior"/></label>:<label className="block text-sm font-semibold">Forma de pagamento<select className={`${input} mt-2`} value={forma} onChange={e=>setForma(e.target.value)}><option value="DINHEIRO">Dinheiro</option><option value="PIX">PIX</option><option value="CARTAO_DEBITO">Débito</option><option value="CARTAO_CREDITO">Crédito</option></select></label>}
      {tipo==='CREDITO'&&forma==='DINHEIRO'&&<label className="block text-sm font-semibold">Vincular recebimento ao caixa (opcional)<select className={`${input} mt-2`} value={caixaId} onChange={e=>setCaixaId(e.target.value)}><option value="">Sem vinculação de caixa</option>{caixas.map(c=><option key={c.id} value={c.id}>Caixa {c.id.slice(0,8)} · Saldo inicial {dinheiro(c.saldoInicial)}</option>)}</select></label>}
      <p className="text-xs text-slate-500">Dinheiro vinculado a um caixa aberto gera suprimento automático no extrato. PIX e cartões não geram movimentação física de dinheiro.</p>
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={()=>setModal(false)}>Cancelar</button><button type="submit" disabled={busy} className={btn}>{busy?'Registrando...':'Confirmar'}</button></div></form></Modal>}
  </>;
}
