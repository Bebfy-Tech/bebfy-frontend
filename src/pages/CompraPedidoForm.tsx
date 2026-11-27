import { useRef,useState } from 'react';
import { Plus,Trash2 } from 'lucide-react';
import { Modal,Notice,MoneyInput,dinheiro,mensagemErro } from '../components/ui';
import { comprasApi,centavos } from '../services/compras';
import type { Compra,ReferenciasCompra,ItemPedido,NovoPedido } from '../services/compras';
export function CompraPedidoForm({refs,onClose,onSaved,produtoInicial}:{refs:ReferenciasCompra;onClose:()=>void;onSaved:(c:Compra)=>void;produtoInicial?:number}){
 const [fornecedorId,setFornecedor]=useState(''),[previsao,setPrevisao]=useState(''),[obs,setObs]=useState(''),[frete,setFrete]=useState('0'),[desconto,setDesconto]=useState('0');
 const inicial=refs.produtos.find(x=>x.id===produtoInicial);
 const [itens,setItens]=useState<ItemPedido[]>(inicial?[{produtoId:inicial.id,modo:'BASE',quantidade:Math.max(1,inicial.estoqueMinimo-inicial.estoqueAtual),custoEmbalagem:Number(inicial.precoCusto)}]:[]);
 const [produto,setProduto]=useState(''),[erro,setErro]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),operation=useRef<{json:string;key:string}|null>(null);
 const subtotal=itens.reduce((n,i)=>n+centavos(i.custoEmbalagem)*i.quantidade,0),total=subtotal+centavos(frete)-centavos(desconto);
 const alter=(id:number,v:Partial<ItemPedido>)=>setItens(xs=>xs.map(i=>i.produtoId===id?{...i,...v}:i));
 const add=()=>{const p=refs.produtos.find(x=>x.id===Number(produto));if(p&&!itens.some(i=>i.produtoId===p.id)){setItens(xs=>[...xs,{produtoId:p.id,modo:'BASE',quantidade:1,custoEmbalagem:Number(p.precoCusto)}]);setProduto('');}};
 async function save(e:React.FormEvent){
  e.preventDefault();if(lock.current)return;
  if(!fornecedorId||!itens.length||itens.length>100||itens.some(i=>!Number.isSafeInteger(i.quantidade)||i.quantidade<1||i.quantidade>1000000||!Number.isFinite(i.custoEmbalagem)||i.custoEmbalagem<=0)||total<=0){setErro('Confira fornecedor, quantidades, custos e total do pedido.');return;}
  const body:Omit<NovoPedido,'chaveOperacao'>={fornecedorId,previsaoEntrega:previsao||undefined,observacao:obs.trim()||undefined,frete:Number(frete||0),desconto:Number(desconto||0),itens};
  const json=JSON.stringify(body);if(operation.current?.json!==json)operation.current={json,key:crypto.randomUUID()};
  lock.current=true;setBusy(true);setErro('');
  try{onSaved(await comprasApi.criar({...body,chaveOperacao:operation.current.key}));}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 return <Modal wide title="Novo pedido de compra" onClose={()=>!lock.current&&onClose()}><form className="fd-form cp-form" onSubmit={e=>void save(e)}>
 <Notice message={erro}/><div className="cp-grid"><label>Fornecedor<select required value={fornecedorId} disabled={busy} onChange={e=>setFornecedor(e.target.value)}><option value="">Selecione um fornecedor ativo</option>{refs.fornecedores.map(f=><option key={f.id} value={f.id}>{f.nomeFantasia||f.razaoSocial}</option>)}</select></label><label>Previsão de entrega<input type="date" value={previsao} disabled={busy} onChange={e=>setPrevisao(e.target.value)}/></label></div>
 <div className="cp-add"><label>Adicionar produto<select value={produto} disabled={busy} onChange={e=>setProduto(e.target.value)}><option value="">Selecione por nome</option>{refs.produtos.filter(p=>!itens.some(i=>i.produtoId===p.id)).map(p=><option key={p.id} value={p.id}>{p.nome} · {p.estoqueAtual} {p.unidadeMedida}</option>)}</select></label><button type="button" className="fd-secondary" disabled={busy||!produto||itens.length>=100} onClick={add}><Plus size={15}/> Adicionar</button></div>
 <div className="cp-items">{itens.map(i=>{const p=refs.produtos.find(x=>x.id===i.produtoId);if(!p)return null;const fator=i.modo==='EMBALAGEM'?p.fardoQuantidade??1:1;return <div key={i.produtoId} className="fd-panel cp-item"><div className="cp-line"><b>{p.nome}</b><button type="button" className="fd-secondary" disabled={busy} aria-label={'Remover '+p.nome} onClick={()=>setItens(xs=>xs.filter(x=>x.produtoId!==i.produtoId))}><Trash2 size={15}/></button></div><div className="cp-grid"><label>Unidade de compra<select value={i.modo} disabled={busy} onChange={e=>{const modo=e.target.value as ItemPedido['modo'];alter(i.produtoId,{modo,custoEmbalagem:Math.round(Number(p.precoCusto)*(modo==='EMBALAGEM'?p.fardoQuantidade??1:1)*100)/100});}}><option value="BASE">{p.unidadeMedida}</option>{(p.fardoQuantidade??1)>1&&<option value="EMBALAGEM">{p.unidadeEmbalagemSigla||'FD'} ({p.fardoQuantidade} {p.unidadeMedida})</option>}</select></label><label>Quantidade<input type="number" min={1} max={1000000} step={1} required value={i.quantidade||''} disabled={busy} onChange={e=>alter(i.produtoId,{quantidade:Number(e.target.value)})}/></label><label>Custo por unidade de compra<MoneyInput required value={i.custoEmbalagem} disabled={busy} onValue={v=>alter(i.produtoId,{custoEmbalagem:Number(v)})}/></label><div className="cp-preview"><small>Entrada prevista</small><b>{i.quantidade*fator} {p.unidadeMedida}</b><small>{dinheiro(centavos(i.custoEmbalagem)*i.quantidade/100)}</small></div></div></div>;})}{!itens.length&&<p className="fd-empty">Adicione os produtos do pedido.</p>}</div>
 <div className="cp-grid"><label>Frete<MoneyInput value={frete} onValue={setFrete} disabled={busy}/></label><label>Desconto<MoneyInput value={desconto} onValue={setDesconto} disabled={busy}/></label></div><label>Observações<textarea rows={2} maxLength={1000} value={obs} disabled={busy} onChange={e=>setObs(e.target.value)}/></label>
 <div className="fd-preview"><span>Subtotal {dinheiro(subtotal/100)}<br/>Total do pedido</span><strong>{dinheiro(total/100)}</strong></div><small>Salvar o pedido não altera estoque nem gera contas a pagar.</small><div className="fd-footer"><button type="button" className="fd-secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="fd-primary" disabled={busy||!itens.length}>{busy?'Salvando...':'Salvar rascunho'}</button></div>
 </form></Modal>;
}
