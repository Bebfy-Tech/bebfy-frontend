import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Truck } from 'lucide-react';
import { api } from '../services/api';
import type { Venda } from '../services/bebfy';
import { btn, card, dataBR, dinheiro, Empty, mensagemErro, Notice, PageTitle } from '../components/ui';

export function DeliveryPage(){
  const [pendentes,setPendentes]=useState<Venda[]>([]);
  const [selecionadas,setSelecionadas]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const load=useCallback(async()=>{setLoading(true);setErro('');try{const r=await api.get<Venda[]>('/vendas/pendentes-acerto-delivery');setPendentes(r.data);setSelecionadas([]);}catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  async function acertar(){
    if(!selecionadas.length||busy)return;setBusy(true);setErro('');
    try{await api.post('/vendas/confirmar-acerto-delivery',{vendaIds:selecionadas});setSucesso('Acerto das entregas confirmado.');await load();}
    catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  const total=pendentes.filter(v=>selecionadas.includes(v.id)).reduce((s,v)=>s+Number(v.valorTotal),0);
  return <>
    <PageTitle title="Entregas e acertos" subtitle="Acompanhe entregas com recebimento pendente e confirme o acerto do entregador." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <div className="mb-5 grid gap-4 sm:grid-cols-2"><div className={`${card} p-5`}><Truck className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Entregas pendentes de acerto</p><strong className="text-3xl">{pendentes.length}</strong></div><div className={`${card} p-5`}><p className="text-sm text-slate-500">Total selecionado</p><strong className="mt-3 block text-2xl">{dinheiro(total)}</strong></div></div>
    <section className={`${card} overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="font-bold">Aguardando acerto</h2><button disabled={!selecionadas.length||busy} onClick={()=>void acertar()} className={btn}><CheckCircle2 size={17}/>{busy?'Confirmando...':`Confirmar ${selecionadas.length} acerto(s)`}</button></div>
    {loading?<p className="p-8 text-center text-sm text-slate-500">Carregando entregas...</p>:!pendentes.length?<div className="p-5"><Empty>Nenhuma entrega aguardando acerto.</Empty></div>:<div className="overflow-x-auto"><table className="w-full min-w-[570px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">Selecionar</th><th className="p-4">Venda</th><th className="p-4">Data</th><th className="p-4">Valor</th><th className="p-4">Cliente</th></tr></thead><tbody className="divide-y divide-slate-100">{pendentes.map(v=><tr key={v.id}><td className="p-4"><input type="checkbox" aria-label={`Selecionar venda ${v.codigoVenda}`} checked={selecionadas.includes(v.id)} onChange={e=>setSelecionadas(a=>e.target.checked?[...a,v.id]:a.filter(x=>x!==v.id))} className="h-4 w-4 accent-teal-700"/></td><td className="p-4 font-bold">#{v.codigoVenda}</td><td className="p-4">{dataBR(v.criadoEm)}</td><td className="p-4 font-bold">{dinheiro(v.valorTotal)}</td><td className="p-4">{v.clienteId?'Cadastrado':'Balcão'}</td></tr>)}</tbody></table></div>}
    </section><p className="mt-4 text-xs text-slate-500">A confirmação marca as vendas como acertadas no backend; não é uma integração automática com maquininha ou banco.</p>
  </>;
}
