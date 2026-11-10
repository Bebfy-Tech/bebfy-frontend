import { useCallback, useEffect, useState } from 'react';
import { Boxes, PackageCheck } from 'lucide-react';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Cliente, Produto } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { btn, card, dataBR, Empty, input, mensagemErro, Notice, PageTitle } from '../components/ui';

export function VasilhamesPage(){
  const [clientes,setClientes]=useState<Cliente[]>([]);
  const [produtos,setProdutos]=useState<Produto[]>([]);
  const [clienteId,setClienteId]=useState('');
  const [produtoId,setProdutoId]=useState('');
  const [tipo,setTipo]=useState('EMPRESTIMO_SAIDA');
  const [quantidade,setQuantidade]=useState('1');
  const [observacao,setObservacao]=useState('');
  const [extrato,setExtrato]=useState<{historico:Linha[];cliente:Cliente}|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{const [c,p]=await Promise.all([bebfy.clientes.listar(),bebfy.produtos.listar()]);setClientes(c);setProdutos(p.filter(x=>(x as Produto&{retornavel?:boolean}).retornavel));}
    catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!clienteId){setExtrato(null);return;}
    let active=true;
    void api.get<{historico:Linha[];cliente:Cliente}>(`/produtos/vasilhames/cliente/${encodeURIComponent(clienteId)}/extrato`)
      .then(r=>{if(active)setExtrato(r.data);})
      .catch(e=>{if(active)setErro(mensagemErro(e));});
    return ()=>{active=false;};
  },[clienteId]);
  async function registrar(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setErro('');
    try{
      await api.post('/produtos/vasilhames/movimentacao',{clienteId,produtoId:Number(produtoId),quantidade:Number(quantidade),tipo,observacao});
      setSucesso('Movimentação de cascos registrada.');setQuantidade('1');
      const [c,p,e]=await Promise.all([
        bebfy.clientes.listar(),bebfy.produtos.listar(),
        api.get<{historico:Linha[];cliente:Cliente}>(`/produtos/vasilhames/cliente/${encodeURIComponent(clienteId)}/extrato`),
      ]);
      setClientes(c);setProdutos(p.filter(x=>(x as Produto&{retornavel?:boolean}).retornavel));setExtrato(e.data);
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  return <>
    <PageTitle title="Vasilhames retornáveis" subtitle="Controle cascos emprestados, devoluções e histórico por cliente." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]"><section className={`${card} p-5 sm:p-7`}><h2 className="mb-5 flex items-center gap-2 font-extrabold"><Boxes size={20} className="text-teal-700"/> Registrar movimentação</h2>
      <form onSubmit={e=>void registrar(e)} className="space-y-4"><label className="block text-sm font-semibold">Cliente<select required className={`${input} mt-2`} value={clienteId} onChange={e=>setClienteId(e.target.value)}><option value="">Selecione...</option>{clientes.map(c=><option value={c.id} key={c.id}>{c.nome} · {c.cascosEmPosse} em posse</option>)}</select></label>
      <label className="block text-sm font-semibold">Produto retornável<select required className={`${input} mt-2`} value={produtoId} onChange={e=>setProdutoId(e.target.value)}><option value="">Selecione...</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Movimento<select className={`${input} mt-2`} value={tipo} onChange={e=>setTipo(e.target.value)}><option value="EMPRESTIMO_SAIDA">Empréstimo</option><option value="DEVOLUCAO_ENTRADA">Devolução</option><option value="QUEBRA_AVARIA">Quebra / avaria</option></select></label><label className="block text-sm font-semibold">Quantidade<input required min={1} type="number" className={`${input} mt-2`} value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label></div>
      <label className="block text-sm font-semibold">Observação<textarea className={`${input} mt-2`} rows={3} value={observacao} onChange={e=>setObservacao(e.target.value)}/></label>
      <button disabled={busy||!clienteId||!produtoId} className={`${btn} w-full`} type="submit"><PackageCheck size={18}/>{busy?'Salvando...':'Registrar movimentação'}</button></form>
    </section>
    <section className={`${card} p-5 sm:p-7`}><h2 className="mb-3 font-extrabold">Extrato do cliente</h2><p className="mb-5 text-sm text-slate-500">Consulte empréstimos e devoluções dos retornáveis.</p>
      {extrato?<><div className="mb-4 rounded-xl bg-emerald-50 p-5"><p className="text-xs text-teal-800">{extrato.cliente.nome}</p><strong className="text-3xl text-teal-900">{extrato.cliente.cascosEmPosse}</strong><span className="ml-2 text-sm text-teal-700">cascos em posse</span></div>
      <div className="max-h-[450px] space-y-3 overflow-y-auto">{extrato.historico.map(h=><div key={String(h.id)} className="flex justify-between gap-4 rounded-xl border border-slate-200 p-3 text-sm"><div><strong>{String((h.produto as Linha|undefined)?.nome||'Vasilhame')}</strong><p className="mt-1 text-xs text-slate-500">{dataBR(h.criadoEm)} · {String(h.observacao||'—')}</p></div><span className={`font-extrabold ${Number(h.quantidade)>0?'text-amber-700':'text-emerald-700'}`}>{Number(h.quantidade)>0?'+':''}{String(h.quantidade)}</span></div>)}{extrato.historico.length===0&&<Empty>Sem movimentações registradas.</Empty>}</div></>:<Empty>Selecione um cliente para visualizar o extrato.</Empty>}
    </section></div>
  </>;
}
