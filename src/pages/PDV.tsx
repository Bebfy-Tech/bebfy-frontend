import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, CreditCard, Minus, Plus, Printer, CheckCircle2, RefreshCcw, Search, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasModule } from '../services/moduleAccess';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import type { Caixa, Cliente, ComprovanteNaoFiscal, FormaPagamento, Produto, TipoEntrega } from '../services/bebfy';
import { btn, card, dinheiro, input, mensagemErro, Notice, secondary, Modal, MoneyInput } from '../components/ui';

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
  const {user,empresa,modules}=useAuth();
  const deliveryAtivo=hasModule(modules,'ENTREGAS_DELIVERY');
  const fiadoAtivo=hasModule(modules,'FIADOS');
  const cascosAtivo=hasModule(modules,'VASILHAMES_RETORNAVEIS');
  const searchRef=useRef<HTMLInputElement>(null);
  const clienteRef=useRef<HTMLSelectElement>(null);
  const descontoRef=useRef<HTMLDivElement>(null);
  const pagamentoRef=useRef<HTMLSelectElement>(null);
  const submitting=useRef(false);
  const [vendaConcluida,setVendaConcluida]=useState<{id:string;numero:string;total:number}|null>(null);
  const [receiptError,setReceiptError]=useState('');
  const [receiptLoading,setReceiptLoading]=useState(false);
  const [recebimento,setRecebimento]=useState(false);
  const finalizeRef=useRef<()=>void>(()=>{});
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
  const entregaVal=deliveryAtivo&&entrega==='DELIVERY'?Math.max(0,Number(taxaEntrega)||0):0;
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
    if(submitting.current||busy||vendaConcluida||!caixa||!user?.funcionarioId||carrinho.length===0)return;
    setErro('');setSucesso('');
    if(descontoVal>subtotal){setErro('Desconto não pode ultrapassar subtotal.');return;}
    if(total<=0){setErro('Venda precisa ter valor positivo.');return;}
    if(!deliveryAtivo&&entrega==='DELIVERY'){setErro('Delivery foi desativado. Selecione retirada no balcão.');setEntrega('RETIRADA_BALCAO');return;}
    if(!fiadoAtivo&&pagamentos.some(p=>p.forma==='FIADO')){setErro('Fiado foi desativado. Escolha outra forma de pagamento.');return;}
    if(entrega==='DELIVERY'&&!enderecoEntrega.trim()){setErro('Informe o endereço da entrega.');return;}
    if(cascosAtivo&&Number(cascosDevolvidos)>0&&!clienteId){setErro('Selecione o cliente para devolução de cascos.');return;}
    if(pagamentos.some(p=>!Number.isFinite(Number(p.valor))||Number(p.valor)<=0)){
      setErro('Informe um valor positivo em todos os pagamentos.');return;
    }
    const saldoDinheiro=pagamentos.some(p=>p.forma==='DINHEIRO');
    if(diferenca>0.009||troco>0&&!saldoDinheiro){setErro(`Os pagamentos precisam cobrir o total de ${dinheiro(total)}. Diferença: ${dinheiro(diferenca)}.`);return;}
    if(pagamentos.some(p=>p.forma==='FIADO')&&!clienteId){setErro('Para vender fiado selecione um cliente.');return;}
    if(pagamentos.filter(p=>p.forma==='DINHEIRO').length>1&&troco>0){setErro('Use apenas um pagamento em dinheiro para calcular o troco.');return;}
    // Single synchronous lock prevents rapid clicks or repeated F9 submissions.
    submitting.current=true;setBusy(true);
    try{
      const venda=await bebfy.vendas.registrar({
        caixaId:caixa.id,funcionarioId:user.funcionarioId,
        ...(clienteId?{clienteId}:{}),desconto:descontoVal,
        tipoEntrega:entrega,taxaEntrega:entregaVal,
        ...(entrega==='DELIVERY'?{enderecoEntrega}:{}),
        ...(cascosAtivo&&Number(cascosDevolvidos)>0?{cascosDevolvidos:Number(cascosDevolvidos)}:{}),
        itens:carrinho.map(i=>({produtoId:i.produto.id,quantidade:i.quantidade,
          precoUnitario:price(i),isFardo:i.isFardo})),
        pagamentos:pagamentoNet(),
      });
      setRecebimento(false);setVendaConcluida({id:venda.id,numero:String(venda.codigoVenda),total});setReceiptError('');setReceiptLoading(true);
      // The server has committed the sale. Never repeat it if receipt retrieval fails.
      setCarrinho([]);setDesconto('0');setPagamentos([{forma:'DINHEIRO',valor:''}]);
      setClienteId('');setEntrega('RETIRADA_BALCAO');setEnderecoEntrega('');
      setTaxaEntrega('0');setCascosDevolvidos('0');
      setSucesso(`Venda #${venda.codigoVenda} registrada com sucesso.`);
      void carregar();
      try{setComprovante(await bebfy.vendas.comprovante(venda.id));}
      catch{setComprovante(null);setReceiptError('Venda registrada. Não foi possível carregar o comprovante. Tente novamente ou consulte o histórico.');}
      finally{setReceiptLoading(false);}
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);submitting.current=false;}
  }
  const novaVenda=()=>{if(receiptLoading)return;setVendaConcluida(null);setComprovante(null);setReceiptError('');setSucesso('');setBusca('');requestAnimationFrame(()=>searchRef.current?.focus());};
  const retryReceipt=async()=>{if(!vendaConcluida||receiptLoading)return;setReceiptLoading(true);setReceiptError('');try{setComprovante(await bebfy.vendas.comprovante(vendaConcluida.id));}catch(e){setReceiptError(mensagemErro(e));}finally{setReceiptLoading(false);}};
  const abrirRecebimento=()=>{if(!carrinho.length||total<=0||busy||vendaConcluida)return;setPagamentos(p=>p.length===1&&p[0].valor===''?[{...p[0],valor:String(total)}]:p);setRecebimento(true);};
  finalizeRef.current=()=>{if(vendaConcluida)return;if(recebimento)void finalizar();else abrirRecebimento();};
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.repeat||vendaConcluida)return;
      if(event.key==='F9'){event.preventDefault();finalizeRef.current();}
      if(recebimento)return;
      if(event.key==='F2'){event.preventDefault();searchRef.current?.focus();}
      if(event.key==='F4'){event.preventDefault();clienteRef.current?.focus();}
      if(event.key==='F6'){event.preventDefault();descontoRef.current?.querySelector('input')?.focus();}
      if(event.key==='F8'){event.preventDefault();finalizeRef.current();}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[vendaConcluida,recebimento]);
  useEffect(()=>{if(recebimento)requestAnimationFrame(()=>pagamentoRef.current?.focus());},[recebimento]);
  return <div className="bf-pdv space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-widest text-blue-400">Frente de caixa</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">PDV Bebfy</h1><p className="mt-1 text-sm text-slate-400">{empresa?.nomeFantasia} · Operador {user?.nome} · F2 buscar · F4 cliente · F6 desconto · F8 receber · F9 finalizar</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-2 text-xs font-bold ${caixa?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{caixa?'● Caixa aberto':'● Caixa fechado'}</span><button onClick={()=>void carregar()} disabled={loading} className={secondary}><RefreshCcw size={16}/> Atualizar</button><Link to={tenantPath("vendas")} className={secondary}>Histórico</Link></div></div>
    <Notice message={erro}/><Notice message={sucesso} success/>
    {loading&&!produtos.length?<div className={`${card} p-12 text-center text-slate-500`}>Carregando PDV...</div>:!caixa?
      <section className={`${card} mx-auto max-w-md p-7`}><Wallet className="text-teal-700" size={35}/><h2 className="mt-4 text-xl font-extrabold">Abra o caixa para começar</h2><p className="mt-2 text-sm text-slate-500">Informe o valor inicial disponível em espécie.</p><label className="mt-6 block text-sm font-semibold">Saldo inicial (R$)<MoneyInput className={`${input} mt-2`} value={saldoInicial} onValue={setSaldoInicial}/></label><button disabled={busy} className={`${btn} mt-5 w-full`} onClick={()=>void abrirCaixa()}>{busy?'Abrindo...':'Abrir meu caixa'}</button></section>
    :<div className="bf-pdv-grid">
      <section className={`${card} bf-pdv-catalog-panel min-w-0 p-3`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-extrabold">Catálogo de produtos</h2><span className="text-xs text-slate-500">{filtrados.length} produto(s)</span></div>
        <div className="relative mb-4"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input autoFocus className={`${input} pl-10`} ref={searchRef} placeholder="Buscar produto ou bipar código (F2)" value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){const produto=produtos.find(p=>p.codigoBarras&&p.codigoBarras===busca.trim());if(produto){e.preventDefault();inserir(produto);setBusca('');}}}}/></div>
        <p className="mb-3 text-xs text-slate-400">Bipe o código de barras e pressione Enter para adicionar o item automaticamente. F2 volta para a busca.</p>
        <div className="bf-pdv-catalog bf-table-scroll overflow-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr><th>Produto / EAN</th><th>Estoque</th><th>Varejo</th><th className="text-right">Adicionar</th></tr></thead><tbody>{filtrados.map(p=><tr key={p.id}><td><strong className="block">{p.nome}</strong><small className="text-slate-400">{p.codigoBarras||'—'}</small></td><td className="tabular-nums">{p.estoqueAtual}</td><td className="font-bold tabular-nums text-emerald-300">{dinheiro(p.precoVendaVarejo)}</td><td><div className="flex justify-end gap-1"><button aria-label={`Adicionar unidade de ${p.nome}`} onClick={()=>inserir(p)} disabled={p.estoqueAtual<1} className={btn}><Plus size={15}/> Un.</button>{Number(p.fardoQuantidade)>1&&<button aria-label={`Adicionar fardo de ${p.nome}`} onClick={()=>fardo(p)} disabled={p.estoqueAtual<Number(p.fardoQuantidade)} className={secondary}><Boxes size={15}/> Fardo</button>}</div></td></tr>)}</tbody></table>{!filtrados.length&&<p className="bf-empty-text">Nenhum produto encontrado.</p>}</div>
      </section>
      <section className={`${card} bf-pdv-sale-panel min-w-0 p-3`}><h2 className="mb-4 flex items-center gap-2 font-extrabold"><ShoppingCart size={20}/> Venda atual</h2>
        <div className="bf-pdv-cart bf-table-scroll overflow-auto"><table className="w-full min-w-[330px] text-left text-sm"><thead><tr><th>Item</th><th>Qtd.</th><th>Total</th><th><span className="sr-only">Remover</span></th></tr></thead><tbody>{carrinho.map(i=><tr key={i.produto.id+(i.isFardo?'F':'U')}><td className="font-semibold">{i.produto.nome}{i.isFardo?' · Fardo':''}</td><td><div className="flex items-center gap-2"><button type="button" onClick={()=>changeQty(i.produto,i.isFardo,-1)} aria-label="Diminuir"><Minus size={16}/></button><b>{i.quantidade}</b><button type="button" onClick={()=>changeQty(i.produto,i.isFardo,1)} disabled={i.quantidade>=maxQuantity(i)} aria-label="Aumentar"><Plus size={16}/></button></div></td><td className="whitespace-nowrap font-bold">{dinheiro(price(i)*i.quantidade)}</td><td><button aria-label="Remover produto" onClick={()=>setCarrinho(a=>a.filter(x=>x!==i))}><Trash2 size={16} className="text-rose-600"/></button></td></tr>)}</tbody></table>{!carrinho.length&&<p className="bf-empty-text">Adicione produtos para montar a venda.</p>}</div>
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <label className="block text-xs font-bold text-slate-600">Cliente {fiadoAtivo?'(opcional; obrigatório para fiado)':'(opcional)'}<select ref={clienteRef} className={`${input} mt-1`} value={clienteId} onChange={e=>{setClienteId(e.target.value);const c=clientes.find(x=>x.id===e.target.value);setEnderecoEntrega(String((c as Cliente&{endereco?:string}|undefined)?.endereco||''));}}><option value="">Venda avulsa / balcão</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{fiadoAtivo?' · Fiado '+dinheiro(c.saldoDevedor):''}</option>)}</select></label>
          {fiadoAtivo&&escolhido&&<p className="text-[11px] text-slate-500">Limite: {dinheiro(escolhido.limiteCredito)} · Saldo atual: {dinheiro(escolhido.saldoDevedor)}</p>}
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Entrega<select className={`${input} mt-1`} value={entrega} onChange={e=>setEntrega(e.target.value as TipoEntrega)}><option value="RETIRADA_BALCAO">Retirada no balcão</option>{deliveryAtivo&&<option value="DELIVERY">Delivery</option>}</select></label><div ref={descontoRef}><label className="block text-xs font-bold text-slate-600">Desconto (R$)<MoneyInput className={`${input} mt-1`} value={desconto} onValue={setDesconto}/></label></div></div>
          {deliveryAtivo&&entrega==='DELIVERY'&&<div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Taxa de entrega<MoneyInput className={`${input} mt-1`} value={taxaEntrega} onValue={setTaxaEntrega}/></label><label className="block text-xs font-bold text-slate-600">Endereço<input className={`${input} mt-1`} required value={enderecoEntrega} onChange={e=>setEnderecoEntrega(e.target.value)}/></label></div>}
          {cascosAtivo&&clienteId&&<label className="block text-xs font-bold text-slate-600">Cascos devolvidos<input className={`${input} mt-1`} type="number" min={0} value={cascosDevolvidos} onChange={e=>setCascosDevolvidos(e.target.value)}/></label>}
          <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{dinheiro(subtotal)}</strong></div><div className="flex justify-between text-xl font-black"><span>Total da venda</span><span className="text-emerald-300">{dinheiro(total)}</span></div>
          <div className="bf-pdv-footer"><button className={`${btn} w-full`} onClick={abrirRecebimento} disabled={busy||!carrinho.length||total<=0}><CreditCard size={18}/> Receber venda · F8</button></div>
        </div>
      </section>
    </div>}
    {recebimento&&<Modal title="Recebimento da venda" onClose={()=>{if(!busy)setRecebimento(false);}}>
      <div className="bf-receipt-total"><small>Total a receber</small><strong>{dinheiro(total)}</strong></div>
      <Notice message={erro}/>
          <div className="border-t border-slate-100 pt-3"><div className="mb-3 flex justify-between"><strong className="flex items-center gap-2 text-sm"><CreditCard size={16}/> Pagamentos</strong><button onClick={()=>setPagamentos(a=>[...a,{forma:'PIX',valor:''}])} className="text-xs font-bold text-teal-800">+ Dividir pagamento</button></div>
            <div className="space-y-2">{pagamentos.map((p,i)=><div key={i} className="flex gap-2"><select ref={i===0?pagamentoRef:undefined} aria-label={`Forma ${i+1}`} className={`${input} !w-[54%]`} value={p.forma} onChange={e=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,forma:e.target.value as FormaPagamento}:x))}>{FORMAS.filter(f=>fiadoAtivo||f.key!=='FIADO').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select><MoneyInput aria-label={`Valor ${i+1}`} className={input} value={p.valor} onValue={v=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,valor:v}:x))}/>{pagamentos.length>1&&<button aria-label="Remover forma de pagamento" onClick={()=>setPagamentos(a=>a.filter((_,k)=>k!==i))} className="text-rose-500"><Trash2 size={17}/></button>}</div>)}</div>
            <div className={`mt-3 flex items-center justify-between rounded-xl border p-4 ${troco>0?'border-amber-500/40 bg-amber-500/10 text-amber-200':'border-[#273247] bg-[#101829] text-slate-300'}`}><span className="text-sm font-bold">{diferenca>0?'Faltam':troco>0?'TROCO':'Pagamentos completos'}</span><strong className={troco>0?'text-2xl font-black':'text-lg font-extrabold'}>{dinheiro(Math.abs(diferenca))}</strong></div>
          </div>

      <button className={`${btn} mt-4 w-full`} onClick={()=>void finalizar()} disabled={busy||diferenca>0.009}>{busy?'Registrando venda...':'Confirmar venda · F9'}</button>
      <p className="mt-3 text-center text-xs text-slate-400">Pix e cartão são informados pelo operador; confirme o recebimento antes de finalizar.</p>
    </Modal>}
    {vendaConcluida&&<Modal title="Venda realizada" onClose={novaVenda}>
      <div className="bf-sale-success"><CheckCircle2 size={42} color="#49cfa0"/><h3>Venda #{vendaConcluida.numero} concluída</h3><strong>{dinheiro(vendaConcluida.total)}</strong><p>Comprovante comercial sem valor fiscal.</p></div>
      {receiptError&&<Notice message={receiptError}/>}
      <div className="grid gap-2">
        {comprovante?<button type="button" onClick={()=>window.print()} className={btn}><Printer size={18}/> Imprimir comprovante não fiscal</button>:<button type="button" disabled={receiptLoading} className={secondary} onClick={()=>void retryReceipt()}>{receiptLoading?'Carregando comprovante…':'Tentar carregar comprovante novamente'}</button>}
        <button type="button" disabled={receiptLoading} className={secondary} onClick={novaVenda}>Iniciar nova venda</button>
      </div>
      {comprovante&&<div className="bf-receipt-print"><Comprovante dados={comprovante}/></div>}
    </Modal>}
  </div>;
}
