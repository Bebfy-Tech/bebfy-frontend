import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleX, Eye, Printer, Plus, RefreshCcw, Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bebfy } from '../services/bebfy';
import type { ComprovanteNaoFiscal, Venda } from '../services/bebfy';
import { hasModule } from '../services/moduleAccess';
import { tenantPath } from '../services/tenantUrls';
import { dinheiro, mensagemErro, Modal, Notice } from '../components/ui';
import './vendas-premium.css';

type Periodo='hoje'|'ontem'|'7dias'|'mes'|'personalizado';
const PERIODOS: {id:Periodo;nome:string}[]=[{id:'hoje',nome:'Hoje'},{id:'ontem',nome:'Ontem'},{id:'7dias',nome:'Últimos 7 dias'},{id:'mes',nome:'Este mês'},{id:'personalizado',nome:'Personalizado'}];
const FORMAS:Record<string,string>={DINHEIRO:'Dinheiro',PIX:'Pix',CARTAO_DEBITO:'Débito',CARTAO_CREDITO:'Crédito',FIADO:'Fiado'};
const STATUS:Record<string,string>={CONCLUIDA:'Concluída',CANCELADA:'Cancelada',ORCAMENTO:'Orçamento'};
const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateTime=(v:string)=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const labelPagamento=(p:string)=>FORMAS[p]??p.replaceAll('_',' ');
const nomeCliente=(v:Venda)=>v.cliente?.nome??(v.clienteId?'Cliente não identificado':'Balcão');
const nomeOperador=(v:Venda)=>v.funcionario?.nome??'—';
const entregaLabel=(v:Venda)=>v.tipoEntrega==='DELIVERY'?'Delivery':'Retirada no balcão';
const pagamentosLabel=(v:Venda)=>Array.from(new Set((v.pagamentos??[]).map(p=>labelPagamento(p.formaPagamento)))).join(' + ')||'—';
function bounds(periodo:Periodo,hoje:Date,inicio:string,fim:string){
 const d=new Date(hoje);d.setHours(0,0,0,0);const end=dateKey(d);
 if(periodo==='personalizado')return {inicio,fim};
 if(periodo==='ontem'){d.setDate(d.getDate()-1);return {inicio:dateKey(d),fim:dateKey(d)};}
 if(periodo==='7dias')d.setDate(d.getDate()-6);
 if(periodo==='mes')d.setDate(1);
 return {inicio:dateKey(d),fim:end};
}
function StatusPill({status}:{status:string}){
 return <span className={'vs-status '+status.toLowerCase()}>● {STATUS[status]??status}</span>;
}
function Receipt({dados}:{dados:ComprovanteNaoFiscal}){
 return <article className="print-area vs-receipt">
  <header><h2>{dados.loja.nome}</h2><strong>{dados.titulo}</strong>{dados.loja.endereco&&<p>{dados.loja.endereco}</p>}{dados.loja.telefone&&<p>{dados.loja.telefone}</p>}</header>
  <div className="vs-receipt-meta">Venda #{dados.venda.numero} · {dateTime(dados.venda.realizadaEm)}<p>Operador: {dados.venda.operador}</p>{dados.venda.cliente&&<p>Cliente: {dados.venda.cliente}</p>}<p>Situação: {STATUS[dados.venda.status]??dados.venda.status}</p></div>
  {dados.itens.map((i,k)=><div className="vs-receipt-line" key={k}><span>{i.quantidade}× {i.descricao}</span><span>{dinheiro(i.total)}</span></div>)}
  <div className="vs-receipt-meta"><div className="vs-receipt-line"><span>Subtotal</span><span>{dinheiro(dados.valores.subtotal)}</span></div><div className="vs-receipt-line"><span>Desconto</span><span>{dinheiro(dados.valores.desconto)}</span></div>{dados.valores.taxaEntrega>0&&<div className="vs-receipt-line"><span>Entrega</span><span>{dinheiro(dados.valores.taxaEntrega)}</span></div>}<div className="vs-receipt-line"><strong>Total</strong><strong>{dinheiro(dados.valores.total)}</strong></div></div>
  {dados.pagamentos.map((p,i)=><p key={i}>{labelPagamento(p.forma)}: {dinheiro(p.valor)}{Number(p.troco)>0?' · Troco: '+dinheiro(p.troco):''}</p>)}
  {dados.loja.mensagem&&<p style={{whiteSpace:"pre-wrap",textAlign:"center"}}>{dados.loja.mensagem}</p>}
  <p className="vs-receipt-warning">{dados.aviso}</p>
 </article>;
}

export function VendasPage(){
 const {user,modules}=useAuth();
 const canCancel=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'')||Boolean(user?.permissoes?.includes('VENDAS_CANCELAR'));
 const deliveryAtivo=hasModule(modules,'ENTREGAS_DELIVERY');
 const [vendas,setVendas]=useState<Venda[]>([]);
 const [busca,setBusca]=useState(''),[periodo,setPeriodo]=useState<Periodo>('hoje'),[situacao,setSituacao]=useState(''),[pagamento,setPagamento]=useState(''),[operador,setOperador]=useState(''),[entrega,setEntrega]=useState('');
 const [inicio,setInicio]=useState(()=>dateKey(new Date())),[fim,setFim]=useState(()=>dateKey(new Date()));
 const [hoje,setHoje]=useState(()=>new Date()),[pagina,setPagina]=useState(1),[tamanho,setTamanho]=useState(10);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const [detalhe,setDetalhe]=useState<Venda|null>(null),[comprovante,setComprovante]=useState<ComprovanteNaoFiscal|null>(null),[cancelar,setCancelar]=useState<Venda|null>(null);
 const lock=useRef(false);
 const load=useCallback(async()=>{setLoading(true);setErro('');try{setVendas(await bebfy.vendas.listar());setHoje(new Date());}catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{const t=window.setInterval(()=>setHoje(new Date()),60000);return()=>window.clearInterval(t);},[]);
 useEffect(()=>{setPagina(1);},[busca,periodo,inicio,fim,situacao,pagamento,operador,entrega,tamanho]);
 const range=bounds(periodo,hoje,inicio,fim);
 const invalid=periodo==='personalizado'&&(!inicio||!fim||inicio>fim);
 const operadores=useMemo(()=>Array.from(new Map(vendas.filter(v=>v.funcionario?.id&&v.funcionario?.nome).map(v=>[v.funcionario!.id,v.funcionario!.nome])).entries()).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),[vendas]);
 const formas=useMemo(()=>Array.from(new Set(vendas.flatMap(v=>(v.pagamentos??[]).map(p=>p.formaPagamento)))),[vendas]);
 const exibirEntrega=deliveryAtivo||vendas.some(v=>v.tipoEntrega==='DELIVERY'); // Historical records remain readable even if the module was disabled.
 const filtrados=useMemo(()=>{if(invalid)return [];const q=busca.trim().toLocaleLowerCase('pt-BR');return vendas.filter(v=>{
  const d=new Date(v.criadoEm);if(Number.isNaN(d.getTime()))return false;const day=dateKey(d);
  if(day<range.inicio||day>range.fim)return false;
  if(situacao&&v.status!==situacao||pagamento&&!(v.pagamentos??[]).some(p=>p.formaPagamento===pagamento)||operador&&(v.funcionario?.id??v.funcionarioId)!==operador||entrega&&(v.tipoEntrega??'RETIRADA_BALCAO')!==entrega)return false;
  return !q||[v.codigoVenda,'#'+v.codigoVenda,v.id,nomeCliente(v),nomeOperador(v),STATUS[v.status],pagamentosLabel(v)].some(x=>String(x??'').toLocaleLowerCase('pt-BR').includes(q));
 }).sort((a,b)=>new Date(b.criadoEm).getTime()-new Date(a.criadoEm).getTime());},[vendas,invalid,range.inicio,range.fim,busca,situacao,pagamento,operador,entrega]);
 const concluidas=filtrados.filter(v=>v.status==='CONCLUIDA');
 const faturamento=concluidas.reduce((s,v)=>s+(Number(v.valorTotal)||0),0);
 const kpis=[{nome:'Faturamento',valor:dinheiro(faturamento),Icon:Banknote,cor:'green'},{nome:'Vendas concluídas',valor:String(concluidas.length),Icon:ShoppingCart,cor:'green'},{nome:'Ticket médio',valor:dinheiro(concluidas.length?faturamento/concluidas.length:0),Icon:BarChart3,cor:'blue'},{nome:'Vendas canceladas',valor:String(filtrados.filter(v=>v.status==='CANCELADA').length),Icon:CircleX,cor:'red'}];
 const paginas=Math.max(1,Math.ceil(filtrados.length/tamanho)),atual=Math.min(pagina,paginas),rows=filtrados.slice((atual-1)*tamanho,atual*tamanho);
 function limpar(){setBusca('');setSituacao('');setPagamento('');setOperador('');setEntrega('');setPeriodo('hoje');setPagina(1);}
 async function detalhes(v:Venda){if(lock.current)return;lock.current=true;setBusy(true);setErro('');try{setDetalhe(await bebfy.vendas.detalhe(v.id));}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}}
 async function recibo(v:Venda){if(lock.current)return;lock.current=true;setBusy(true);setErro('');try{const r=await bebfy.vendas.comprovante(v.id);setDetalhe(null);setComprovante(r);}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}}
 async function pedirCancelamento(v:Venda){if(!canCancel||lock.current||v.status!=='CONCLUIDA')return;lock.current=true;setBusy(true);setErro('');try{const d=await bebfy.vendas.detalhe(v.id);if(d.caixa?.status==='FECHADO'){setErro('Venda vinculada a caixa fechado. O cancelamento exige estorno financeiro separado.');return;}if(d.status!=='CONCLUIDA'){setErro('Esta venda não está mais concluída. Atualize a lista.');return;}setDetalhe(null);setCancelar(d);}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}}
 async function cancelarVenda(){if(!cancelar||!canCancel||lock.current)return;lock.current=true;setBusy(true);setErro('');setSucesso('');try{await bebfy.vendas.cancelar(cancelar.id);setCancelar(null);setSucesso('Venda cancelada e estoque atualizado.');await load();}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}}
 return <div className="vs-page">
  <header className="vs-header"><div className="vs-heading"><h1>Vendas</h1><p>Gerencie e acompanhe suas vendas realizadas.</p></div><button type="button" className="vs-secondary" disabled={loading||busy} onClick={()=>void load()} aria-label="Atualizar vendas" title="Atualizar vendas"><RefreshCcw size={17} className={loading?'animate-spin':''}/></button><Link to={tenantPath('pdv')} className="vs-primary"><Plus size={18}/> Nova venda</Link></header>
  {!detalhe&&!cancelar&&!comprovante&&<Notice message={erro} onClose={()=>setErro('')}/>}<Notice message={sucesso} success onClose={()=>setSucesso('')}/>
  <section className="vs-kpis" aria-label="Indicadores das vendas filtradas">{kpis.map(k=><article className="vs-panel vs-kpi" key={k.nome}><span className={'vs-icon '+k.cor}><k.Icon size={23}/></span><div><small>{k.nome}</small><strong className={k.cor}>{loading?'—':k.valor}</strong></div></article>)}</section>
  <div className="vs-period-row"><nav className="vs-periods" aria-label="Período das vendas">{PERIODOS.map(p=><button type="button" key={p.id} className="vs-secondary" aria-pressed={periodo===p.id} onClick={()=>setPeriodo(p.id)}>{p.id==='personalizado'&&<CalendarDays size={14}/>} {p.nome}</button>)}</nav><small>{range.inicio&&range.fim?range.inicio.split('-').reverse().join('/')+' – '+range.fim.split('-').reverse().join('/'):''}</small></div>
  {periodo==='personalizado'&&<div className="vs-custom"><label>De<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label><label>Até<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>{invalid&&<span role="alert">Informe um intervalo de datas válido.</span>}</div>}
  <label className="vs-search"><Search size={19}/><input aria-label="Buscar vendas" placeholder="Buscar venda, cliente ou operador..." value={busca} onChange={e=>setBusca(e.target.value)}/></label>
  <div className="vs-filters">
   <label>Situação<select value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="">Todas as situações</option>{Object.entries(STATUS).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
   <label>Pagamento<select value={pagamento} onChange={e=>setPagamento(e.target.value)}><option value="">Todos os pagamentos</option>{formas.map(f=><option key={f} value={f}>{labelPagamento(f)}</option>)}</select></label>
   <label>Operador<select value={operador} onChange={e=>setOperador(e.target.value)}><option value="">Todos os operadores</option>{operadores.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
   {exibirEntrega&&<label>Tipo de entrega<select value={entrega} onChange={e=>setEntrega(e.target.value)}><option value="">Todas as entregas</option><option value="RETIRADA_BALCAO">Retirada no balcão</option><option value="DELIVERY">Delivery</option></select></label>}
   <button type="button" className="vs-secondary vs-clear" onClick={limpar}>Limpar filtros</button>
  </div>
  <section className="vs-panel vs-list"><div className="vs-list-title"><h2>Histórico de vendas</h2><small>{filtrados.length} venda(s) · Indicadores do filtro atual</small></div>
   <div className="vs-table-scroll"><table className="vs-table"><thead><tr>{['Venda','Data / horário','Cliente','Pagamento','Total','Situação','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(v=><tr key={v.id}><td><button className="vs-code" type="button" onClick={()=>void detalhes(v)} disabled={busy}>#{String(v.codigoVenda).padStart(4,'0')}</button></td><td>{dateTime(v.criadoEm)}</td><td><strong>{nomeCliente(v)}</strong><small>{nomeOperador(v)}</small></td><td>{pagamentosLabel(v)}</td><td className="vs-money">{dinheiro(v.valorTotal)}</td><td><StatusPill status={v.status}/></td><td><div className="vs-actions"><button type="button" disabled={busy} title="Detalhes" aria-label={'Detalhes da venda '+v.codigoVenda} onClick={()=>void detalhes(v)}><Eye size={17}/></button><button type="button" disabled={busy} title="Comprovante não fiscal" aria-label={'Comprovante da venda '+v.codigoVenda} onClick={()=>void recibo(v)}><Printer size={17}/></button>{canCancel&&v.status==='CONCLUIDA'&&<button type="button" className="danger" disabled={busy} title="Cancelar venda" aria-label={'Cancelar venda '+v.codigoVenda} onClick={()=>void pedirCancelamento(v)}><CircleX size={17}/></button>}</div></td></tr>)}</tbody></table>{loading?<div className="vs-empty">Carregando vendas...</div>:!rows.length&&<div className="vs-empty"><ShoppingCart size={28}/><p>Nenhuma venda encontrada neste período.</p></div>}</div>
   <footer className="vs-pagination"><span>Exibindo {filtrados.length?(atual-1)*tamanho+1:0} a {Math.min(atual*tamanho,filtrados.length)} de {filtrados.length} vendas</span><div><label>Itens por página <select value={tamanho} onChange={e=>setTamanho(Number(e.target.value))}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><button className="vs-secondary" type="button" disabled={atual<=1} onClick={()=>setPagina(atual-1)} aria-label="Página anterior"><ChevronLeft size={16}/></button>{Array.from({length:Math.min(5,paginas)},(_,i)=>Math.max(1,Math.min(atual-2,paginas-4))+i).map(n=><button type="button" key={n} className="vs-secondary" aria-current={n===atual?'page':undefined} onClick={()=>setPagina(n)}>{n}</button>)}<button className="vs-secondary" type="button" disabled={atual>=paginas} onClick={()=>setPagina(atual+1)} aria-label="Próxima página"><ChevronRight size={16}/></button></div></footer>
  </section>
  {detalhe&&<Modal wide title={'Venda #'+detalhe.codigoVenda} onClose={()=>{if(!busy)setDetalhe(null);}}><div className="vs-modal"><Notice message={erro} onClose={()=>setErro('')}/><div className="vs-detail-head"><div><small>Valor total</small><strong>{dinheiro(detalhe.valorTotal)}</strong></div><StatusPill status={detalhe.status}/></div><div className="vs-detail-meta">{[['Data e horário',dateTime(detalhe.criadoEm)],['Cliente',nomeCliente(detalhe)],['Operador',nomeOperador(detalhe)],['Entrega',entregaLabel(detalhe)],['Caixa',detalhe.caixa?.status==='FECHADO'?'Fechado':detalhe.caixa?.status==='ABERTO'?'Aberto':'—'],['Endereço',detalhe.enderecoEntrega||'—']].map(([n,v])=><div key={n}><small>{n}</small><strong>{v}</strong></div>)}</div>
    <h3>Produtos vendidos</h3><div className="vs-table-scroll"><table className="vs-table"><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço unitário</th><th>Total</th></tr></thead><tbody>{(detalhe.itens??[]).map(i=><tr key={i.id}><td>{i.produto?.nome??'Produto #'+i.produtoId}{i.unidadesEstoque!=null&&i.unidadesEstoque!==i.quantidade&&<small>{i.unidadesEstoque} unidades de estoque</small>}</td><td>{i.quantidade}</td><td>{dinheiro(i.precoUnitario)}</td><td>{dinheiro(i.precoTotal)}</td></tr>)}</tbody></table></div>
    <div className="vs-detail-bottom"><section><h3>Pagamentos</h3>{(detalhe.pagamentos??[]).map((p,i)=><div className="vs-detail-line" key={i}><span>{labelPagamento(p.formaPagamento)}{Number(p.troco)>0&&<small>Troco: {dinheiro(p.troco)}</small>}</span><strong>{dinheiro(p.valor)}</strong></div>)}</section><section><h3>Resumo da venda</h3>{[['Subtotal',detalhe.subtotal],['Desconto',detalhe.desconto],['Taxa de entrega',detalhe.taxaEntrega],['Total',detalhe.valorTotal]].map(([n,v])=><div key={String(n)} className="vs-detail-line"><span>{n}</span><strong>{v==null?'—':dinheiro(v)}</strong></div>)}</section></div>
    <div className="vs-modal-footer">{canCancel&&detalhe.status==='CONCLUIDA'&&detalhe.caixa?.status!=='FECHADO'&&<button type="button" className="vs-danger" disabled={busy} onClick={()=>void pedirCancelamento(detalhe)}><CircleX size={17}/> Cancelar venda</button>}<button type="button" className="vs-secondary" disabled={busy} onClick={()=>setDetalhe(null)}>Fechar</button><button type="button" className="vs-primary" disabled={busy} onClick={()=>void recibo(detalhe)}><Printer size={17}/> Comprovante</button></div>
  </div></Modal>}
  {cancelar&&<Modal title={'Cancelar venda #'+cancelar.codigoVenda+'?'} onClose={()=>{if(!busy)setCancelar(null);}}><div className="vs-modal"><Notice message={erro} onClose={()=>setErro('')}/><p>O cancelamento preserva o histórico e estorna o estoque e o fiado, quando aplicável. Não realiza devolução automática de pagamentos externos.</p><div className="vs-cancel-value">{dinheiro(cancelar.valorTotal)}</div><div className="vs-modal-footer"><button type="button" className="vs-secondary" disabled={busy} onClick={()=>setCancelar(null)}>Não cancelar</button><button type="button" className="vs-danger" disabled={busy} onClick={()=>void cancelarVenda()}>{busy?'Cancelando...':'Confirmar cancelamento'}</button></div></div></Modal>}
  {comprovante&&<Modal title="Comprovante comercial não fiscal" onClose={()=>setComprovante(null)}><div className="vs-modal"><Receipt dados={comprovante}/><div className="vs-modal-footer"><button type="button" className="vs-secondary" onClick={()=>setComprovante(null)}>Fechar</button><button type="button" className="vs-primary" onClick={()=>window.print()}><Printer size={17}/> Imprimir</button></div></div></Modal>}
 </div>;
}
