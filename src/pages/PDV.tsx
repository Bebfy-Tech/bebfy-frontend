import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, CreditCard, Minus, Plus, Printer, RefreshCcw, Search, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bebfy } from '../services/bebfy';
import type { Caixa, Cliente, ComprovanteNaoFiscal, FormaPagamento, Produto, TipoEntrega } from '../services/bebfy';
import { btn, card, dinheiro, Empty, input, mensagemErro, Notice, secondary } from '../components/ui';

type ItemCarrinho={produto:Produto;quantidade:number;isFardo:boolean};
type Pagamento={forma:FormaPagamento;valor:string};
const FORMAS:{key:FormaPagamento;label:string}[]=[
  {key:'DINHEIRO',label:'Dinheiro'},{key:'PIX',label:'PIX'},
  {key:'CARTAO_DEBITO',label:'Cartão de débito'},
  {key:'CARTAO_CREDITO',label:'Cartão de crédito'},
  {key:'FIADO',label:'Fiado'},
];
const price=(i:ItemCarrinho)=>Number(i.isFardo&&i.produto.precoVendaAtacado!=null
  ?i.produto.precoVendaAtacado:i.produto.precoVendaVarejo);
const maxQuantity=(i:ItemCarrinho)=>Math.floor(i.produto.estoqueAtual/
  (i.isFardo?Math.max(1,Number(i.produto.fardoQuantidade)||1):1));

function Comprovante({dados}:{dados:ComprovanteNaoFiscal}){
  return <article className="print-area mx-auto max-w-sm space-y-3 bg-white p-6 font-mono text-xs text-black print:max-w-none print:p-0">
    <h2 className="text-center text-base font-extrabold">{dados.titulo}</h2>
    <p className="text-center font-semibold">{dados.loja.nome}</p>
    {dados.loja.endereco&&<p className="text-center">{dados.loja.endereco}</p>}
    {dados.loja.telefone&&<p className="text-center">{dados.loja.telefone}</p>}
    <div className="border-y border-dashed border-black py-2"><p>Venda #{dados.venda.numero} · {new Date(dados.venda.realizadaEm).toLocaleString('pt-BR')}</p><p>Operador: {dados.venda.operador}</p>{dados.venda.cliente&&<p>Cliente: {dados.venda.cliente}</p>}</div>
    {dados.itens.map((i,k)=><div key={k} className="flex justify-between gap-2"><span>{i.quantidade}× {i.descricao}</span><span>{dinheiro(i.total)}</span></div>)}
    <div className="space-y-1 border-t border-dashed border-black pt-2"><div className="flex justify-between"><span>Subtotal</span><span>{dinheiro(dados.valores.subtotal)}</span></div><div className="flex justify-between"><span>Desconto</span><span>{dinheiro(dados.valores.desconto)}</span></div>{dados.valores.taxaEntrega>0&&<div className="flex justify-between"><span>Entrega</span><span>{dinheiro(dados.valores.taxaEntrega)}</span></div>}<div className="flex justify-between text-sm font-extrabold"><span>Total</span><span>{dinheiro(dados.valores.total)}</span></div></div>
    {dados.pagamentos.map((p,i)=><p key={i}>{p.forma}: {dinheiro(p.valor)}{p.troco>0?` · Troco: ${dinheiro(p.troco)}`:''}</p>)}
    <p className="border-t border-dashed border-black pt-3 text-center font-black uppercase">{dados.aviso}</p>
  </article>;
}

export function PDV(){
  const {user,empresa}=useAuth();
  const [produtos,setProdutos]=useState<Produto[]>([]);
  const [clientes,setClientes]=useState<Cliente[]>([]);
  const [carrinho,setCarrinho]=useState<ItemCarrinho[]>([]);
  const [caixa,setCaixa]=useState<Caixa|null>(null);
  const [busca,setBusca]=useState('');
  const [saldoInicial,setSaldoInicial]=useState('0');
  const [clienteId,setClienteId]=useState('');
  const [entrega,setEntrega]=useState<TipoEntrega>('RETIRADA_BALCAO');
  const [enderecoEntrega,setEnderecoEntrega]=useState('');
  const [taxaEntrega,setTaxaEntrega]=useState('0');
  const [desconto,setDesconto]=useState('0');
  const [pagamentos,setPagamentos]=useState<Pagamento[]>([{forma:'DINHEIRO',valor:''}]);
  const [cascosDevolvidos,setCascosDevolvidos]=useState('0');
  const [comprovante,setComprovante]=useState<ComprovanteNaoFiscal|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');

  const carregar=useCallback(async()=>{
    if(!user?.funcionarioId)return;
    setLoading(true);setErro('');
    try{
      const [catalogo,cli,aberto]=await Promise.all([
        bebfy.produtos.listar(),bebfy.clientes.listar(),
        bebfy.caixa.abertoPorOperador(user.funcionarioId).catch((e:unknown)=>{
          if((e as {response?:{status?:number}})?.response?.status===404)return null;
          throw e;
        }),
      ]);
      setProdutos(catalogo.filter(p=>p.ativo));setClientes(cli.filter(c=>c.ativo));setCaixa(aberto);
    }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[user?.funcionarioId]);
  useEffect(()=>{void carregar();},[carregar]);

  const subtotal=useMemo(()=>carrinho.reduce((s,i)=>s+price(i)*i.quantidade,0),[carrinho]);
  const descontoVal=Math.max(0,Number(desconto)||0);
  const entregaVal=entrega==='DELIVERY'?Math.max(0,Number(taxaEntrega)||0):0;
  const total=Math.max(0,Math.round((subtotal-descontoVal+entregaVal)*100)/100);
  const pago=pagamentos.reduce((s,p)=>s+(Number(p.valor)||0),0);
  const diferenca=Math.round((total-pago)*100)/100;
  const troco=Math.max(0,-diferenca);
  const escolhido=clientes.find(c=>c.id===clienteId);
  const filtrados=useMemo(()=>{
    const q=busca.trim().toLowerCase();
    return produtos.filter(p=>!q||p.nome.toLowerCase().includes(q)||(p.codigoBarras||'').includes(q));
  },[produtos,busca]);
  const inserir=(p:Produto)=>{
    if(p.estoqueAtual<1)return;
    setCarrinho(curr=>{
      const found=curr.find(i=>i.produto.id===p.id&&!i.isFardo);
      if(found)return curr.map(i=>i===found?{...i,quantidade:Math.min(maxQuantity(i),i.quantidade+1)}:i);
      return [...curr,{produto:p,quantidade:1,isFardo:false}];
    });
    setComprovante(null);setSucesso('');
  };
  const changeQty=(p:Produto,isFardo:boolean,diff:number)=>setCarrinho(curr=>curr.map(i=>i.produto.id===p.id&&i.isFardo===isFardo?
    {...i,quantidade:Math.max(0,Math.min(maxQuantity(i),i.quantidade+diff))}:i).filter(i=>i.quantidade>0));
  const fardo=(p:Produto)=>{
    const quant=Math.max(1,Number(p.fardoQuantidade)||1);
    if(quant<2||p.estoqueAtual<quant)return;
    setCarrinho(curr=>{
      const found=curr.find(i=>i.produto.id===p.id&&i.isFardo);
      if(found)return curr.map(i=>i===found?{...i,quantidade:Math.min(maxQuantity(i),i.quantidade+1)}:i);
      return [...curr,{produto:p,isFardo:true,quantidade:1}];
    });
  };
  const pagamentoNet=()=>{
    const resultado=pagamentos.map(p=>({
      formaPagamento:p.forma,
      valor:Number(p.valor),
      ...(p.forma==='DINHEIRO'&&troco>0?{troco}:{}),
    }));
    return resultado;
  };
  async function abrirCaixa(){
    if(!user?.funcionarioId||busy)return;
    const v=Number(saldoInicial);if(!Number.isFinite(v)||v<0){setErro('Informe um saldo inicial válido.');return;}
    setBusy(true);setErro('');
    try{setCaixa(await bebfy.caixa.abrir({operadorId:user.funcionarioId,saldoInicial:v}));setSucesso('Caixa aberto.');}
    catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  async function finalizar(){
    if(busy||!caixa||!user?.funcionarioId||carrinho.length===0)return;
    setErro('');setSucesso('');
    if(descontoVal>subtotal){setErro('Desconto não pode ultrapassar subtotal.');return;}
    if(total<=0){setErro('Venda precisa ter valor positivo.');return;}
    if(entrega==='DELIVERY'&&!enderecoEntrega.trim()){setErro('Informe o endereço da entrega.');return;}
    if(Number(cascosDevolvidos)>0&&!clienteId){setErro('Selecione o cliente para devolução de cascos.');return;}
    if(pagamentos.some(p=>!Number.isFinite(Number(p.valor))||Number(p.valor)<=0)){
      setErro('Informe um valor positivo em todos os pagamentos.');return;
    }
    const saldoDinheiro=pagamentos.some(p=>p.forma==='DINHEIRO');
    if(diferenca>0.009||troco>0&&!saldoDinheiro){setErro(`Os pagamentos precisam cobrir o total de ${dinheiro(total)}. Diferença: ${dinheiro(diferenca)}.`);return;}
    if(pagamentos.some(p=>p.forma==='FIADO')&&!clienteId){setErro('Para vender fiado selecione um cliente.');return;}
    if(pagamentos.filter(p=>p.forma==='DINHEIRO').length>1&&troco>0){setErro('Use apenas um pagamento em dinheiro para calcular o troco.');return;}
    // Non-cash payments do not confirm a processor transaction: operator must confirm externally.
    setBusy(true);
    try{
      const venda=await bebfy.vendas.registrar({
        caixaId:caixa.id,funcionarioId:user.funcionarioId,
        ...(clienteId?{clienteId}:{}),desconto:descontoVal,
        tipoEntrega:entrega,taxaEntrega:entregaVal,
        ...(entrega==='DELIVERY'?{enderecoEntrega}:{}),
        ...(Number(cascosDevolvidos)>0?{cascosDevolvidos:Number(cascosDevolvidos)}:{}),
        itens:carrinho.map(i=>({produtoId:i.produto.id,quantidade:i.quantidade,
          precoUnitario:price(i),isFardo:i.isFardo})),
        pagamentos:pagamentoNet(),
      });
      // The server has committed the sale. Never repeat it if receipt retrieval fails.
      setCarrinho([]);setDesconto('0');setPagamentos([{forma:'DINHEIRO',valor:''}]);
      setClienteId('');setEntrega('RETIRADA_BALCAO');setEnderecoEntrega('');
      setTaxaEntrega('0');setCascosDevolvidos('0');
      setSucesso(`Venda #${venda.codigoVenda} registrada com sucesso.`);
      void carregar();
      try{setComprovante(await bebfy.vendas.comprovante(venda.id));}
      catch{setComprovante(null);setErro(`Venda #${venda.codigoVenda} concluída, mas o comprovante não carregou. Abra o histórico de vendas para imprimir. Não repita a venda.`);}
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  return <main className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-widest text-teal-700">Frente de caixa</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">PDV Bebfy</h1><p className="mt-1 text-sm text-slate-500">{empresa?.nomeFantasia} · Operador {user?.nome}</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-2 text-xs font-bold ${caixa?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{caixa?'● Caixa aberto':'● Caixa fechado'}</span><button onClick={()=>void carregar()} disabled={loading} className={secondary}><RefreshCcw size={16}/> Atualizar</button><Link to="/vendas" className={secondary}>Histórico</Link></div></div>
    <Notice message={erro}/><Notice message={sucesso} success/>
    {loading&&!produtos.length?<div className={`${card} p-12 text-center text-slate-500`}>Carregando PDV...</div>:!caixa?
      <section className={`${card} mx-auto max-w-md p-7`}><Wallet className="text-teal-700" size={35}/><h2 className="mt-4 text-xl font-extrabold">Abra o caixa para começar</h2><p className="mt-2 text-sm text-slate-500">Informe o valor inicial disponível em espécie.</p><label className="mt-6 block text-sm font-semibold">Saldo inicial (R$)<input className={`${input} mt-2`} type="number" min={0} step=".01" value={saldoInicial} onChange={e=>setSaldoInicial(e.target.value)}/></label><button disabled={busy} className={`${btn} mt-5 w-full`} onClick={()=>void abrirCaixa()}>{busy?'Abrindo...':'Abrir meu caixa'}</button></section>
    :<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_415px]">
      <section className={`${card} min-w-0 p-4 sm:p-5`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-extrabold">Catálogo de produtos</h2><span className="text-xs text-slate-500">{filtrados.length} produto(s)</span></div>
        <div className="relative mb-4"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input autoFocus className={`${input} pl-10`} placeholder="Nome ou código de barras" value={busca} onChange={e=>setBusca(e.target.value)}/></div>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">{filtrados.map(p=><div key={p.id} className="rounded-xl border border-slate-200 p-4 transition hover:border-teal-500">
          <div className="flex justify-between gap-2"><div className="min-w-0"><strong className="text-sm">{p.nome}</strong><p className="mt-1 text-xs text-slate-500">EAN: {p.codigoBarras||'—'} · {p.estoqueAtual} un.</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><ShoppingCart size={19}/></span></div>
          <p className="mt-3 text-xl font-extrabold text-teal-800">{dinheiro(p.precoVendaVarejo)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>inserir(p)} disabled={p.estoqueAtual<1} className={`${btn} flex-1 !py-2`}><Plus size={16}/> Unidade</button>
          {Number(p.fardoQuantidade)>1&&<button title="Adicionar fardo" onClick={()=>fardo(p)} disabled={p.estoqueAtual<Number(p.fardoQuantidade)} className={`${secondary} !py-2`}><Boxes size={16}/> Fardo</button>}</div>
        </div>)}{!filtrados.length&&<div className="sm:col-span-2"><Empty>Nenhum produto encontrado.</Empty></div>}</div>
      </section>
      <section className={`${card} min-w-0 p-4 sm:p-5`}><h2 className="mb-4 flex items-center gap-2 font-extrabold"><ShoppingCart size={20}/> Venda atual</h2>
        <div className="max-h-[245px] space-y-2 overflow-y-auto">{carrinho.map(i=><div key={i.produto.id+(i.isFardo?'F':'U')} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2 text-sm"><strong>{i.produto.nome}{i.isFardo?' · Fardo':''}</strong><button aria-label="Remover produto" onClick={()=>setCarrinho(a=>a.filter(x=>x!==i))}><Trash2 size={17} className="text-rose-600"/></button></div><div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center gap-3"><button onClick={()=>changeQty(i.produto,i.isFardo,-1)} aria-label="Diminuir"><Minus size={17}/></button><b>{i.quantidade}</b><button onClick={()=>changeQty(i.produto,i.isFardo,1)} disabled={i.quantidade>=maxQuantity(i)} aria-label="Aumentar"><Plus size={17}/></button></div><strong className="text-sm">{dinheiro(price(i)*i.quantidade)}</strong></div></div>)}{!carrinho.length&&<Empty>Adicione produtos para montar a venda.</Empty>}</div>
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <label className="block text-xs font-bold text-slate-600">Cliente (opcional; obrigatório para fiado)<select className={`${input} mt-1`} value={clienteId} onChange={e=>{setClienteId(e.target.value);const c=clientes.find(x=>x.id===e.target.value);setEnderecoEntrega(String((c as Cliente&{endereco?:string}|undefined)?.endereco||''));}}><option value="">Venda avulsa / balcão</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome} · Fiado {dinheiro(c.saldoDevedor)}</option>)}</select></label>
          {escolhido&&<p className="text-[11px] text-slate-500">Limite: {dinheiro(escolhido.limiteCredito)} · Saldo atual: {dinheiro(escolhido.saldoDevedor)}</p>}
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Entrega<select className={`${input} mt-1`} value={entrega} onChange={e=>setEntrega(e.target.value as TipoEntrega)}><option value="RETIRADA_BALCAO">Retirada no balcão</option><option value="DELIVERY">Delivery</option></select></label><label className="block text-xs font-bold text-slate-600">Desconto (R$)<input className={`${input} mt-1`} type="number" min={0} step=".01" value={desconto} onChange={e=>setDesconto(e.target.value)}/></label></div>
          {entrega==='DELIVERY'&&<div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Taxa de entrega<input className={`${input} mt-1`} type="number" min={0} step=".01" value={taxaEntrega} onChange={e=>setTaxaEntrega(e.target.value)}/></label><label className="block text-xs font-bold text-slate-600">Endereço<input className={`${input} mt-1`} required value={enderecoEntrega} onChange={e=>setEnderecoEntrega(e.target.value)}/></label></div>}
          {clienteId&&<label className="block text-xs font-bold text-slate-600">Cascos devolvidos<input className={`${input} mt-1`} type="number" min={0} value={cascosDevolvidos} onChange={e=>setCascosDevolvidos(e.target.value)}/></label>}
          <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{dinheiro(subtotal)}</strong></div><div className="flex justify-between text-xl font-black"><span>Total da venda</span><span className="text-teal-800">{dinheiro(total)}</span></div>
          <div className="border-t border-slate-100 pt-3"><div className="mb-3 flex justify-between"><strong className="flex items-center gap-2 text-sm"><CreditCard size={16}/> Pagamentos</strong><button onClick={()=>setPagamentos(a=>[...a,{forma:'PIX',valor:''}])} className="text-xs font-bold text-teal-800">+ Dividir pagamento</button></div>
            <div className="space-y-2">{pagamentos.map((p,i)=><div key={i} className="flex gap-2"><select aria-label={`Forma ${i+1}`} className={`${input} !w-[54%]`} value={p.forma} onChange={e=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,forma:e.target.value as FormaPagamento}:x))}>{FORMAS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select><input aria-label={`Valor ${i+1}`} type="number" min=".01" step=".01" className={input} value={p.valor} onChange={e=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,valor:e.target.value}:x))} placeholder="Valor R$"/>{pagamentos.length>1&&<button aria-label="Remover forma de pagamento" onClick={()=>setPagamentos(a=>a.filter((_,k)=>k!==i))} className="text-rose-500"><Trash2 size={17}/></button>}</div>)}</div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{diferenca>0?'Faltam':troco>0?'Troco':'Pagamentos completos'}</span><strong>{dinheiro(Math.abs(diferenca))}</strong></div>
          </div>
          <button className={`${btn} w-full`} onClick={()=>void finalizar()} disabled={busy||!carrinho.length||total<=0}>{busy?'Registrando venda...':'Finalizar venda'}</button><p className="text-center text-[11px] leading-relaxed text-slate-500">PIX e cartão são recebimentos informados pelo operador. Não existe confirmação automática da instituição financeira. O comprovante não tem valor fiscal.</p>
        </div>
      </section>
    </div>}
    {comprovante&&<section className={`${card} p-4 sm:p-6`}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">Comprovante da última venda</h2><button onClick={()=>window.print()} className={btn}><Printer size={17}/> Imprimir</button></div><Comprovante dados={comprovante}/></section>}
  </main>;
}
