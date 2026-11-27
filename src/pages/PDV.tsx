import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, CreditCard, Minus, Plus, Printer, CheckCircle2, RefreshCcw, Search, ShoppingCart, Trash2, Wallet, Grid2X2, List, Package, ChevronLeft, ChevronRight, Banknote, QrCode, HandCoins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasModule } from '../services/moduleAccess';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import type { Caixa, Cliente, ComprovanteNaoFiscal, FormaPagamento, Produto, TipoEntrega } from '../services/bebfy';
import { btn, dinheiro, input, mensagemErro, Notice, secondary, Modal, MoneyInput } from '../components/ui';

import { ProdutoFoto } from '../components/ProdutoFoto';
import { creditoDisponivel, erroCredito, rotuloCredito, modalidade } from '../services/credito';
import './pdv-premium.css';

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
  const pagamentoRef=useRef<HTMLSelectElement>(null);
  const submitting=useRef(false);
  const [vendaConcluida,setVendaConcluida]=useState<{id:string;numero:string;total:number}|null>(null);
  const [receiptError,setReceiptError]=useState('');
  const [receiptLoading,setReceiptLoading]=useState(false);
  const [recebimento,setRecebimento]=useState(false);
  const [produtos,setProdutos]=useState<Produto[]>([]);
  const [clientes,setClientes]=useState<Cliente[]>([]);
  const [carrinho,setCarrinho]=useState<ItemCarrinho[]>([]);
  const [caixa,setCaixa]=useState<Caixa|null>(null);
  const [busca,setBusca]=useState('');
  const [categoria,setCategoria]=useState('');
  const [modo,setModo]=useState<'lista'|'grade'>('lista');
  const [pagina,setPagina]=useState(1);
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
  const podeFiado=fiadoAtivo&&creditoDisponivel(escolhido)>0;
  const valorFiado=pagamentos.filter(p=>p.forma==='FIADO').reduce((s,p)=>s+Number(p.valor||0),0);
  const categorias=useMemo(()=>Array.from(new Set(produtos.map(p=>p.categoria?.nome).filter((v):v is string=>Boolean(v)))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[produtos]);
  const filtrados=useMemo(()=>{
    const q=busca.trim().toLocaleLowerCase('pt-BR');
    return produtos.filter(p=>(!categoria||p.categoria?.nome===categoria)&&(!q||[p.nome,p.codigoBarras,p.id,p.marca].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(q))));
  },[produtos,busca,categoria]);
  useEffect(()=>{setPagina(1);},[busca,categoria,modo]);
  const porPagina=modo==='grade'?12:10;
  const paginas=Math.max(1,Math.ceil(filtrados.length/porPagina));
  const atual=Math.min(pagina,paginas);
  const visiveis=filtrados.slice((atual-1)*porPagina,atual*porPagina);
  // Units and packs share the same physical stock.
  const restante=(p:Produto,items:ItemCarrinho[]=carrinho)=>Math.max(0,p.estoqueAtual-items.filter(i=>i.produto.id===p.id).reduce((sum,i)=>sum+i.quantidade*(i.isFardo?Math.max(1,Number(i.produto.fardoQuantidade)||1):1),0));
  const inserir=(p:Produto)=>{
    if(p.estoqueAtual<1)return;
    setCarrinho(curr=>{
      if(restante(p,curr)<1)return curr;
      const found=curr.find(i=>i.produto.id===p.id&&!i.isFardo);
      if(found)return curr.map(i=>i===found?{...i,quantidade:Math.min(maxQuantity(i),i.quantidade+1)}:i);
      return [...curr,{produto:p,quantidade:1,isFardo:false}];
    });
    setComprovante(null);setSucesso('');
  };
  const changeQty=(p:Produto,isFardo:boolean,diff:number)=>setCarrinho(curr=>{
    if(diff>0&&restante(p,curr)<(isFardo?Math.max(1,Number(p.fardoQuantidade)||1):1))return curr;
    return curr.map(i=>i.produto.id===p.id&&i.isFardo===isFardo?{...i,quantidade:Math.max(0,Math.min(maxQuantity(i),i.quantidade+diff))}:i).filter(i=>i.quantidade>0);
  });
  const fardo=(p:Produto)=>{
    const quant=Math.max(1,Number(p.fardoQuantidade)||1);
    if(quant<2||p.estoqueAtual<quant)return;
    setCarrinho(curr=>{
      if(restante(p,curr)<quant)return curr;
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
    if(pagamentos.some(p=>p.forma==='FIADO')){const msg=erroCredito(escolhido,valorFiado);if(msg){setErro(msg);return;}}
    if(pagamentos.filter(p=>p.forma==='DINHEIRO').length>1&&troco>0){setErro('Use apenas um pagamento em dinheiro para calcular o troco.');return;}
    // Single synchronous lock prevents rapid clicks or repeated submissions.
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
  const novaVenda=()=>{if(receiptLoading)return;setVendaConcluida(null);setComprovante(null);setReceiptError('');setSucesso('');setBusca('');setCategoria('');setPagina(1);requestAnimationFrame(()=>searchRef.current?.focus());};
  const retryReceipt=async()=>{if(!vendaConcluida||receiptLoading)return;setReceiptLoading(true);setReceiptError('');try{setComprovante(await bebfy.vendas.comprovante(vendaConcluida.id));}catch(e){setReceiptError(mensagemErro(e));}finally{setReceiptLoading(false);}};
  const abrirRecebimento=()=>{if(!carrinho.length||total<=0||busy||vendaConcluida)return;if(descontoVal>subtotal){setErro('Desconto não pode ultrapassar subtotal.');return;}if(entrega==='DELIVERY'&&(!deliveryAtivo||!enderecoEntrega.trim())){setErro('Confira os dados da entrega.');return;}setErro('');setPagamentos(p=>p.length===1?[{...p[0],forma:!podeFiado&&p[0].forma==='FIADO'?'DINHEIRO':p[0].forma,valor:String(total)}]:p);setRecebimento(true);};
  useEffect(()=>{if(recebimento)requestAnimationFrame(()=>pagamentoRef.current?.focus());},[recebimento]);
  const botoesProduto=(p:Produto)=><div className="pdv3-add"><button type="button" aria-label={'Adicionar unidade de '+p.nome} onClick={()=>inserir(p)} disabled={busy||restante(p)<1} className="pdv3-primary"><Plus size={15}/> Un.</button>{Number(p.fardoQuantidade)>1&&<button type="button" aria-label={'Adicionar fardo de '+p.nome} onClick={()=>fardo(p)} disabled={busy||restante(p)<Number(p.fardoQuantidade)} className="pdv3-secondary"><Boxes size={15}/> Fardo</button>}</div>;
  const foto=(p:Produto)=><div className="pdv3-photo"><ProdutoFoto produtoId={String(p.id)} editable={false}/></div>;
  return <div className="bf-pdv pdv3">
    <header className="pdv3-header"><span className="pdv3-title-icon"><ShoppingCart size={24}/></span><div className="pdv3-heading"><h1>Frente de Caixa</h1><p>Venda rápida e atendimento ao cliente · {user?.nome} · {empresa?.nomeFantasia}</p></div>
      <span className={'pdv3-status '+(caixa?'open':'closed')}>● {caixa?'Caixa aberto':'Caixa fechado'}</span><button type="button" onClick={()=>void carregar()} disabled={loading||busy} className="pdv3-secondary" aria-label="Atualizar catálogo" title="Atualizar catálogo"><RefreshCcw size={16} className={loading?'animate-spin':''}/></button><Link to={tenantPath('vendas')} className="pdv3-secondary">Histórico de vendas</Link>
    </header>
    <Notice message={erro}/><Notice message={sucesso} success/>
    {loading&&!produtos.length?<div className="pdv3-panel pdv3-empty">Carregando PDV...</div>:!caixa?
      <section className="pdv3-panel pdv3-open"><Wallet size={34}/><h2>Abra o caixa para começar</h2><p>Informe o valor inicial disponível em espécie.</p><label className="pdv3-field">Saldo inicial (R$)<MoneyInput value={saldoInicial} onValue={setSaldoInicial}/></label><button type="button" disabled={busy} className="pdv3-primary" onClick={()=>void abrirCaixa()}>{busy?'Abrindo...':'Abrir meu caixa'}</button></section>
    :<div className="pdv3-grid">
      <div className="pdv3-left">
       <label className="pdv3-search"><Search size={20}/><input autoFocus ref={searchRef} aria-label="Buscar produto ou código de barras" placeholder="Buscar produto ou bipar código de barras" value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const q=busca.trim();const produto=produtos.find(p=>p.codigoBarras&&p.codigoBarras===q);if(produto){if(restante(produto)<1){setErro('Estoque insuficiente para '+produto.nome+'.');return;}inserir(produto);setBusca('');setCategoria('');setErro('');}else if(q)setErro('Código de barras não encontrado.');}}}/></label>
       <nav className="pdv3-categories" aria-label="Categorias do catálogo"><button type="button" aria-pressed={!categoria} onClick={()=>setCategoria('')}>Todos</button>{categorias.map(c=><button type="button" key={c} aria-pressed={categoria===c} onClick={()=>setCategoria(c)}>{c}</button>)}</nav>
       <section className="pdv3-panel pdv3-catalog">
        <div className="pdv3-panel-title"><h2>Catálogo de produtos <small>{filtrados.length} produto(s)</small></h2><div className="pdv3-view"><button type="button" aria-pressed={modo==='lista'} onClick={()=>setModo('lista')} title="Lista"><List size={16}/> Lista</button><button type="button" aria-pressed={modo==='grade'} onClick={()=>setModo('grade')} title="Grade"><Grid2X2 size={16}/> Grade</button></div></div>
        <div className="pdv3-catalog-scroll">
         {modo==='lista'?<table className="pdv3-table"><thead><tr><th>Produto</th><th>Estoque</th><th>Preço</th><th>Adicionar</th></tr></thead><tbody>{visiveis.map(p=><tr key={p.id}><td><div className="pdv3-product">{foto(p)}<span><strong>{p.nome}</strong><small>{p.codigoBarras||'Cód. '+p.id} · {p.unidadeMedida}</small></span></div></td><td><span className={restante(p)<1?'pdv3-stock-zero':''}>{restante(p)}</span></td><td className="pdv3-price">{dinheiro(p.precoVendaVarejo)}</td><td>{botoesProduto(p)}</td></tr>)}</tbody></table>:<div className="pdv3-product-grid">{visiveis.map(p=><article key={p.id}>{foto(p)}<strong>{p.nome}</strong><small>Disponível: {restante(p)} un.</small><b className="pdv3-price">{dinheiro(p.precoVendaVarejo)}</b>{botoesProduto(p)}</article>)}</div>}
         {!filtrados.length&&<div className="pdv3-empty"><Package size={30}/><p>Nenhum produto encontrado.</p></div>}
        </div>
        <footer className="pdv3-pages"><small>{filtrados.length?(atual-1)*porPagina+1:0}–{Math.min(atual*porPagina,filtrados.length)} de {filtrados.length}</small><div><button type="button" className="pdv3-secondary" aria-label="Página anterior" disabled={atual<=1} onClick={()=>setPagina(atual-1)}><ChevronLeft size={16}/></button><span>{atual} / {paginas}</span><button type="button" className="pdv3-secondary" aria-label="Próxima página" disabled={atual>=paginas} onClick={()=>setPagina(atual+1)}><ChevronRight size={16}/></button></div></footer>
       </section>
      </div>
      <section className="pdv3-panel pdv3-sale">
       <div className="pdv3-panel-title"><h2><ShoppingCart size={19}/> Venda atual</h2><small>{carrinho.length} produto(s)</small></div>
       <div className="pdv3-cart-scroll"><table className="pdv3-table pdv3-cart-table"><thead><tr><th>Produto</th><th>Qtd.</th><th>Total</th><th aria-label="Remover"/></tr></thead><tbody>{carrinho.map(i=><tr key={i.produto.id+(i.isFardo?'F':'U')}><td><strong>{i.produto.nome}</strong><small>{i.isFardo?'Fardo':'Unidade'} · {dinheiro(price(i))}</small></td><td><div className="pdv3-qty"><button type="button" disabled={busy} onClick={()=>changeQty(i.produto,i.isFardo,-1)} aria-label="Diminuir quantidade"><Minus size={14}/></button><b>{i.quantidade}</b><button type="button" disabled={busy||restante(i.produto)<(i.isFardo?Math.max(1,Number(i.produto.fardoQuantidade)||1):1)} onClick={()=>changeQty(i.produto,i.isFardo,1)} aria-label="Aumentar quantidade"><Plus size={14}/></button></div></td><td className="pdv3-line-total">{dinheiro(price(i)*i.quantidade)}</td><td><button type="button" className="pdv3-remove" disabled={busy} aria-label={'Remover '+i.produto.nome} onClick={()=>setCarrinho(a=>a.filter(x=>x!==i))}><Trash2 size={16}/></button></td></tr>)}</tbody></table>{!carrinho.length&&<div className="pdv3-empty"><ShoppingCart size={30}/><p>Adicione produtos para iniciar a venda.</p></div>}</div>
       <div className="pdv3-sale-bottom">
        <label className="pdv3-field">Cliente {fiadoAtivo?'(obrigatório para fiado)':'(opcional)'}<select value={clienteId} onChange={e=>{setClienteId(e.target.value);const c=clientes.find(x=>x.id===e.target.value);setEnderecoEntrega(String((c as Cliente&{endereco?:string}|undefined)?.endereco||''));if(!e.target.value)setCascosDevolvidos('0');}}><option value="">Consumidor / venda balcão</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{fiadoAtivo?' · Fiado '+dinheiro(c.saldoDevedor):''}</option>)}</select></label>
        {fiadoAtivo&&escolhido&&<p className="pdv3-note">{rotuloCredito(escolhido)} · Disponível: {modalidade(escolhido)==='ILIMITADO'?'Ilimitado':dinheiro(creditoDisponivel(escolhido))} · Saldo atual: {dinheiro(escolhido.saldoDevedor)}</p>}
        <div className="pdv3-fields">{deliveryAtivo&&<label className="pdv3-field">Tipo de entrega<select value={entrega} onChange={e=>setEntrega(e.target.value as TipoEntrega)}><option value="RETIRADA_BALCAO">Retirada no balcão</option><option value="DELIVERY">Delivery</option></select></label>}<label className="pdv3-field">Desconto (R$)<MoneyInput value={desconto} onValue={setDesconto}/></label></div>
        {deliveryAtivo&&entrega==='DELIVERY'&&<div className="pdv3-fields"><label className="pdv3-field">Taxa de entrega<MoneyInput value={taxaEntrega} onValue={setTaxaEntrega}/></label><label className="pdv3-field">Endereço<input required value={enderecoEntrega} onChange={e=>setEnderecoEntrega(e.target.value)}/></label></div>}
        {cascosAtivo&&clienteId&&<label className="pdv3-field">Cascos devolvidos<input type="number" min={0} value={cascosDevolvidos} onChange={e=>setCascosDevolvidos(e.target.value)}/></label>}
        <div className="pdv3-totals"><div><span>Subtotal</span><strong>{dinheiro(subtotal)}</strong></div>{descontoVal>0&&<div><span>Desconto</span><strong>− {dinheiro(descontoVal)}</strong></div>}{entregaVal>0&&<div><span>Entrega</span><strong>{dinheiro(entregaVal)}</strong></div>}</div>
       </div>
       <footer className="pdv3-sale-footer"><div className="pdv3-total"><span>TOTAL A RECEBER</span><strong>{dinheiro(total)}</strong></div><button type="button" className="pdv3-primary pdv3-receive" onClick={abrirRecebimento} disabled={busy||!carrinho.length||total<=0}><CreditCard size={20}/> Receber venda</button></footer>
      </section>
    </div>}
    {recebimento&&<Modal title="Recebimento da venda" onClose={()=>{if(!busy)setRecebimento(false);}}>
      <div className="bf-receipt-total"><small>Total a receber</small><strong>{dinheiro(total)}</strong></div>{fiadoAtivo&&<p className="pdv3-note">{escolhido?rotuloCredito(escolhido)+(modalidade(escolhido)==='LIMITADO'?' · Disponível: '+dinheiro(creditoDisponivel(escolhido)):''):'Selecione um cliente para utilizar fiado.'}</p>}{valorFiado>0&&erroCredito(escolhido,valorFiado)&&<Notice message={erroCredito(escolhido,valorFiado)!}/>}
      {pagamentos.length===1&&<div className="pdv3-payment-options">{FORMAS.filter(f=>podeFiado||f.key!=='FIADO').map(f=>{const Icon=f.key==='DINHEIRO'?Banknote:f.key==='PIX'?QrCode:f.key==='FIADO'?HandCoins:CreditCard;return <button type="button" key={f.key} aria-pressed={pagamentos[0].forma===f.key} disabled={busy} onClick={()=>setPagamentos([{forma:f.key,valor:String(total)}])}><Icon size={22}/>{f.label}</button>;})}</div>}
      <Notice message={erro}/>
          <div className="border-t border-slate-100 pt-3"><div className="mb-3 flex justify-between"><strong className="flex items-center gap-2 text-sm"><CreditCard size={16}/> Pagamentos</strong><button onClick={()=>setPagamentos(a=>[...a,{forma:'PIX',valor:''}])} className="text-xs font-bold text-teal-800">+ Dividir pagamento</button></div>
            <div className="space-y-2">{pagamentos.map((p,i)=><div key={i} className="flex gap-2"><select ref={i===0?pagamentoRef:undefined} aria-label={`Forma ${i+1}`} className={`${input} !w-[54%]`} value={p.forma} onChange={e=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,forma:e.target.value as FormaPagamento}:x))}>{FORMAS.filter(f=>podeFiado||f.key!=='FIADO').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select><MoneyInput aria-label={`Valor ${i+1}`} className={input} value={p.valor} onValue={v=>setPagamentos(a=>a.map((x,k)=>k===i?{...x,valor:v}:x))}/>{pagamentos.length>1&&<button aria-label="Remover forma de pagamento" onClick={()=>setPagamentos(a=>a.filter((_,k)=>k!==i))} className="text-rose-500"><Trash2 size={17}/></button>}</div>)}</div>
            <div className={`mt-3 flex items-center justify-between rounded-xl border p-4 ${troco>0?'border-amber-500/40 bg-amber-500/10 text-amber-200':'border-[#273247] bg-[#101829] text-slate-300'}`}><span className="text-sm font-bold">{diferenca>0?'Faltam':troco>0?'TROCO':'Pagamentos completos'}</span><strong className={troco>0?'text-2xl font-black':'text-lg font-extrabold'}>{dinheiro(Math.abs(diferenca))}</strong></div>
          </div>

      <button className={`${btn} mt-4 w-full`} onClick={()=>void finalizar()} disabled={busy||diferenca>0.009}>{busy?'Registrando venda...':'Confirmar venda'}</button>
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
