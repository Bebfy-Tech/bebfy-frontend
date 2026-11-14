import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, History, Search, Warehouse } from 'lucide-react';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Produto } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { Link } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { tenantPath } from '../services/tenantUrls';
import { btn, card, dataBR, Empty, input, mensagemErro, Modal, Notice, PageTitle, secondary } from '../components/ui';

const movimentos=[
  ['ENTRADA_COMPRA','Entrada de compra'],['AJUSTE_ENTRADA','Ajuste positivo'],
  ['AJUSTE_SAIDA','Ajuste negativo'],['PERDA','Perda'],['AVARIA','Avaria'],
  ['AJUSTE_MANUAL','Ajuste manual'],
];
export function EstoquePage(){
  const [produtos,setProdutos]=useState<Produto[]>([]);
  const [movs,setMovs]=useState<Linha[]>([]);
  const [busca,setBusca]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [modal,setModal]=useState(false);
  const [produtoId,setProdutoId]=useState('');
  const [tipo,setTipo]=useState('ENTRADA_COMPRA');
  const [quantidade,setQuantidade]=useState('1');
  const [motivo,setMotivo]=useState('');
  const [observacao,setObservacao]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{const [p,m]=await Promise.all([bebfy.produtos.listar(),api.get<Linha[]>('/movimentacoes-estoque')]);setProdutos(p);setMovs(m.data);}
    catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const filtrados=useMemo(()=>produtos.filter(p=>p.nome.toLowerCase().includes(busca.toLowerCase())||(p.codigoBarras||'').includes(busca)),[produtos,busca]);
  const baixos=produtos.filter(p=>p.estoqueAtual<=Number((p as Produto&{estoqueMinimo?:number}).estoqueMinimo??0));
  async function registrar(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setErro('');
    try{
      await api.post('/movimentacoes-estoque',{produtoId:Number(produtoId),tipo,quantidade:Number(quantidade),motivo,observacao});
      setModal(false);setSucesso('Movimentação lançada com sucesso.');setProdutoId('');setQuantidade('1');await load();
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  return <>
    <PageTitle title="Movimentações de estoque" subtitle="Acompanhe saldos, entradas, ajustes, perdas e avarias." action={()=>setModal(true)} onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <section className="mb-5 grid gap-4 sm:grid-cols-3"><div className={`${card} p-5`}><Warehouse size={22} className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Produtos cadastrados</p><strong className="text-3xl">{produtos.length}</strong></div><div className={`${card} p-5`}><ArrowDownToLine size={22} className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Unidades em estoque</p><strong className="text-3xl">{produtos.reduce((x,p)=>x+p.estoqueAtual,0)}</strong></div><div className={`${card} p-5`}><AlertTriangle size={22} className="text-amber-600"/><p className="mt-3 text-sm text-slate-500">Produtos em nível mínimo</p><strong className="text-3xl">{baixos.length}</strong></div></section>
    <Link to={tenantPath('estoque/importar-xml')} className={`${btn} mb-5`}><FileUp size={18}/> Importar NF-e XML</Link>
    <section className={`${card} mb-5 overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="font-bold">Posição de estoque</h2><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input className={`${input} pl-10`} value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produtos"/></div></div><div className="overflow-x-auto"><table className="min-w-[530px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Produto</th><th className="p-4">EAN</th><th className="p-4">Disponível</th><th className="p-4">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{filtrados.map(p=><tr key={p.id}><td className="p-4 font-semibold">{p.nome}</td><td className="p-4 text-slate-500">{p.codigoBarras||'—'}</td><td className="p-4 font-bold">{p.estoqueAtual}</td><td className="p-4">{p.estoqueAtual<=Number((p as Produto&{estoqueMinimo?:number}).estoqueMinimo??0)?<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Reposição</span>:<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Normal</span>}</td></tr>)}</tbody></table>{!loading&&!filtrados.length&&<div className="p-5"><Empty>Sem produtos para exibir.</Empty></div>}</div></section>
    <section className={`${card} overflow-hidden`}><h2 className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold"><History size={18}/> Histórico de movimentações</h2><div className="overflow-x-auto"><table className="w-full min-w-[630px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">Data</th><th className="p-4">Produto</th><th className="p-4">Tipo</th><th className="p-4">Quantidade</th><th className="p-4">Motivo</th></tr></thead><tbody className="divide-y divide-slate-100">{movs.map(m=><tr key={String(m.id)}><td className="p-4">{dataBR(m.criadoEm)}</td><td className="p-4">{String((m.produto as Linha|undefined)?.nome||produtos.find(x=>x.id===m.produtoId)?.nome||m.produtoId)}</td><td className="p-4">{String(m.tipo).replaceAll('_',' ')}</td><td className="p-4 font-bold">{String(m.quantidade)}</td><td className="p-4 text-slate-500">{String(m.motivo||'—')}</td></tr>)}</tbody></table>{!loading&&movs.length===0&&<div className="p-5"><Empty>Sem movimentações registradas.</Empty></div>}</div></section>
    {modal&&<Modal title="Registrar movimentação de estoque" onClose={()=>setModal(false)}><form onSubmit={e=>void registrar(e)} className="space-y-4">
      <label className="block text-sm font-semibold">Produto<select className={`${input} mt-2`} value={produtoId} required onChange={e=>setProdutoId(e.target.value)}><option value="">Selecione o produto</option>{produtos.map(p=><option value={p.id} key={p.id}>{p.nome} · {p.estoqueAtual} em estoque</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Tipo<select className={`${input} mt-2`} value={tipo} onChange={e=>setTipo(e.target.value)}>{movimentos.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="block text-sm font-semibold">Quantidade<input type="number" min={1} required className={`${input} mt-2`} value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label></div>
      <label className="block text-sm font-semibold">Motivo<input className={`${input} mt-2`} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex.: inventário da loja"/></label><label className="block text-sm font-semibold">Observações<textarea className={`${input} mt-2`} value={observacao} onChange={e=>setObservacao(e.target.value)} rows={3}/></label>
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={()=>setModal(false)}>Cancelar</button><button type="submit" disabled={busy} className={btn}><ArrowUpFromLine size={16}/>{busy?'Salvando...':'Registrar'}</button></div>
    </form></Modal>}
  </>;
}
