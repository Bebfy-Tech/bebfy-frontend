import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Eye, Lock, PlusCircle, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Caixa } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { btn, card, dataBR, dinheiro, Empty, input, mensagemErro, Modal, Notice, PageTitle, secondary } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

type Extrato = {caixaId:string;status:string;saldoInicial:string|number;totalSuprimentos:number;totalSangrias:number;totalDinheiroVendas:number;saldoParcialSistema:number;movimentacoes:Linha[]};

export function CaixasPage(){
  const { user }=useAuth();
  const [caixas,setCaixas]=useState<Caixa[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [selecionado,setSelecionado]=useState<Caixa|null>(null);
  const [extrato,setExtrato]=useState<Extrato|null>(null);
  const [modal,setModal]=useState<'abrir'|'movimentar'|'fechar'|null>(null);
  const [saldoInicial,setSaldoInicial]=useState('0');
  const [saldoFinal,setSaldoFinal]=useState('');
  const [valor,setValor]=useState('');
  const [tipo,setTipo]=useState<'SANGRIA'|'SUPRIMENTO'>('SANGRIA');
  const [categoria,setCategoria]=useState('');
  const [observacao,setObservacao]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{setCaixas(await bebfy.caixa.listar());}
    catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function detalhar(c:Caixa){
    setBusy(true);setErro('');setSelecionado(c);
    try{setExtrato((await api.get<Extrato>(`/caixa/${c.id}/extrato`)).data);}
    catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  async function salvar(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setErro('');
    try{
      if(modal==='abrir'){
        if(!user?.funcionarioId)throw new Error('Operador não identificado.');
        await bebfy.caixa.abrir({operadorId:user.funcionarioId,saldoInicial:Number(saldoInicial)});
        setSucesso('Caixa aberto com sucesso.');
      } else if(modal==='fechar'&&selecionado) {
        await bebfy.caixa.fechar(selecionado.id,Number(saldoFinal));
        setSucesso('Caixa fechado e saldo conciliado.');
      } else if(modal==='movimentar'&&selecionado) {
        await api.post(`/caixa/${selecionado.id}/movimentacao`,{tipo,valor:Number(valor),categoria,observacao});
        setSucesso('Movimentação registrada no caixa.');
      }
      setModal(null);setValor('');setCategoria('');await load();
      if(selecionado){
        const updated=(await api.get<Caixa>(`/caixa/${selecionado.id}`)).data;
        setSelecionado(updated);
        const ex=(await api.get<Extrato>(`/caixa/${selecionado.id}/extrato`)).data;
        setExtrato(ex);
      }
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  const abertas=caixas.filter(c=>c.status==='ABERTO');
  const caixaProprio=abertas.find(c=>c.operadorId===user?.funcionarioId);
  return <>
    <PageTitle title="Controle de caixas" subtitle="Abertura, sangria, suprimento, extrato de movimentações e fechamento." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className={`${card} p-5`}><Wallet className="text-teal-700"/><p className="mt-3 text-sm text-slate-500">Caixas abertos</p><strong className="text-3xl">{abertas.length}</strong></div><div className={`${card} p-5`}><p className="text-sm text-slate-500">Turnos registrados</p><strong className="mt-3 block text-3xl">{caixas.length}</strong></div><div className={`${card} p-5`}><p className="text-sm text-slate-500">Saldo inicial em aberto</p><strong className="mt-3 block text-2xl">{dinheiro(abertas.reduce((a,c)=>a+Number(c.saldoInicial),0))}</strong></div></div>
    <div className="mb-5 flex flex-wrap gap-2">{!caixaProprio&&<button className={btn} onClick={()=>setModal('abrir')}><PlusCircle size={17}/> Abrir meu caixa</button>}{caixaProprio&&<button className={secondary} onClick={()=>void detalhar(caixaProprio)}><Eye size={17}/> Ver meu caixa aberto</button>}</div>
    <section className={`${card} mb-5 overflow-hidden`}><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Histórico de caixas</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Operador</th><th className="p-4">Abertura</th><th className="p-4">Inicial</th><th className="p-4">Status</th><th className="p-4">Saldo final</th><th className="p-4">Extrato</th></tr></thead><tbody className="divide-y divide-slate-100">{caixas.map(c=><tr key={c.id}><td className="p-4 font-semibold">{String((c as Caixa&{operador?:{nome:string}}).operador?.nome||'Operador')}</td><td className="p-4">{dataBR(c.abertoEm)}</td><td className="p-4">{dinheiro(c.saldoInicial)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.status==='ABERTO'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{c.status}</span></td><td className="p-4">{c.saldoFinalSistema!=null?dinheiro(c.saldoFinalSistema):'—'}</td><td className="p-4"><button className="rounded-lg p-2 text-teal-700 hover:bg-teal-50" aria-label="Ver extrato" onClick={()=>void detalhar(c)}><Eye size={18}/></button></td></tr>)}</tbody></table>{!loading&&!caixas.length&&<div className="p-5"><Empty>Nenhum caixa foi aberto.</Empty></div>}</div></section>
    {selecionado&&<section className={`${card} p-5 sm:p-6`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold">Extrato do caixa</h2><p className="mt-1 text-xs text-slate-500">Caixa {selecionado.id.slice(0,8)} · {selecionado.status}</p></div><button onClick={()=>{setSelecionado(null);setExtrato(null);}} className={secondary}>Fechar detalhes</button></div>
      {extrato&&<><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['Saldo inicial',extrato.saldoInicial],['Dinheiro em vendas',extrato.totalDinheiroVendas],['Suprimentos',extrato.totalSuprimentos],['Sangrias',extrato.totalSangrias],['Saldo no sistema',extrato.saldoParcialSistema]].map(([label,value])=><div className="rounded-xl bg-slate-50 p-3" key={String(label)}><p className="text-xs text-slate-500">{label}</p><strong className="mt-2 block text-lg">{dinheiro(value)}</strong></div>)}</div><h3 className="mt-6 mb-3 font-bold">Movimentações manuais</h3><div className="space-y-2">{extrato.movimentacoes.map(m=><div key={String(m.id)} className="flex justify-between gap-4 rounded-xl border border-slate-100 p-3 text-sm"><div><p className="font-semibold">{String(m.categoria)} · {String(m.tipo)}</p><p className="text-xs text-slate-500">{dataBR(m.criadoEm)}</p></div><strong>{dinheiro(m.valor)}</strong></div>)}{!extrato.movimentacoes.length&&<Empty>Sem movimentações manuais.</Empty>}</div></>}
      {selecionado.status==='ABERTO'&&<div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>setModal('movimentar')} className={secondary}><ArrowUpRight size={17}/> Sangria / suprimento</button><button onClick={()=>setModal('fechar')} className={btn}><Lock size={17}/> Fechar caixa</button></div>}
    </section>}
    {modal&&<Modal title={modal==='abrir'?'Abrir meu caixa':modal==='fechar'?'Fechar caixa':'Movimentar caixa'} onClose={()=>setModal(null)}><form onSubmit={e=>void salvar(e)} className="space-y-4">
      {modal==='abrir'&&<label className="block text-sm font-semibold">Dinheiro inicial para troco (R$)<input type="number" min="0" step=".01" required className={`${input} mt-2`} value={saldoInicial} onChange={e=>setSaldoInicial(e.target.value)}/></label>}
      {modal==='fechar'&&<><p className="text-sm text-slate-600">Conte o dinheiro físico e informe o saldo real da gaveta. O sistema calculará eventuais diferenças.</p><label className="block text-sm font-semibold">Saldo final contado (R$)<input type="number" min="0" step=".01" required className={`${input} mt-2`} value={saldoFinal} onChange={e=>setSaldoFinal(e.target.value)}/></label></>}
      {modal==='movimentar'&&<><label className="block text-sm font-semibold">Tipo<select className={`${input} mt-2`} value={tipo} onChange={e=>setTipo(e.target.value as 'SANGRIA'|'SUPRIMENTO')}><option value="SANGRIA">Sangria (retirada)</option><option value="SUPRIMENTO">Suprimento (entrada)</option></select></label><label className="block text-sm font-semibold">Valor (R$)<input type="number" min=".01" step=".01" required className={`${input} mt-2`} value={valor} onChange={e=>setValor(e.target.value)}/></label><label className="block text-sm font-semibold">Categoria / motivo<input className={`${input} mt-2`} required value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ex.: retirada de segurança"/></label><label className="block text-sm font-semibold">Observação<textarea className={`${input} mt-2`} rows={3} value={observacao} onChange={e=>setObservacao(e.target.value)}/></label></>}
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={()=>setModal(null)}>Cancelar</button><button disabled={busy} className={btn} type="submit">{busy?'Processando...':modal==='fechar'?'Confirmar fechamento':modal==='abrir'?'Abrir caixa':'Registrar movimentação'} {modal==='movimentar'&&<ArrowDownLeft size={16}/>}</button></div>
    </form></Modal>}
  </>;
}
