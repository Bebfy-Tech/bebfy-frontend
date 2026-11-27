import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, CalendarClock, ChevronLeft, ChevronRight, FileUp, History, Package, PackageX, Plus, RefreshCcw, Search, Warehouse, ClipboardList, Wallet, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasModule, routeModules } from '../services/moduleAccess';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Produto } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { tenantPath } from '../services/tenantUrls';
import { mensagemErro, Modal, Notice } from '../components/ui';
import { ProdutoFoto } from '../components/ProdutoFoto';
import './estoque-premium.css';

type Aba='posicao'|'inventarios'|'movimentacoes'|'perdas'|'lotes';
const operacoes=[['ENTRADA_COMPRA','Entrada de mercadoria'],['AJUSTE_ENTRADA','Ajuste positivo'],['AJUSTE_SAIDA','Saída / ajuste negativo'],['PERDA','Perda'],['AVARIA','Avaria']];
const labels:Record<string,string>={...Object.fromEntries(operacoes),SAIDA_VENDA:'Saída por venda',AJUSTE_MANUAL:'Ajuste manual (entrada)',AVARIA_PERDA:'Avaria / perda',ENTRADA_CASCO:'Entrada de casco',SAIDA_CASCO:'Saída de casco'};
const saida=(tipo:unknown)=>/SAIDA|PERDA|AVARIA|BAIXA/.test(String(tipo));
const num=(v:unknown)=>Number(v)||0;
const fmt=(v:unknown)=>num(v).toLocaleString('pt-BR');
const moeda=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const ehPerda=(tipo:unknown)=>/PERDA|AVARIA/.test(String(tipo));
const text=(v:unknown)=>String(v??'');
const normalize=(v:unknown)=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateTime=(v:unknown)=>v?new Date(String(v)).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
// Expiration is a calendar date, not a local timestamp.
const dateOnly=(v:unknown)=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—';
const statusProduto=(p:Produto)=>p.estoqueAtual<=0?'zero':p.estoqueAtual<=num(p.estoqueMinimo)?'baixo':'normal';
const statusLote=(l:Linha)=>{
 if(num(l.quantidade)<=0)return 'esgotado';
 if(!l.dataVencimento)return 'sem-data';
 const hoje=new Date(),limite=new Date(hoje);limite.setDate(limite.getDate()+30);
 const data=text(l.dataVencimento).slice(0,10);
 return data<dateKey(hoje)?'vencido':data<=dateKey(limite)?'avencer':'normal';
};
function ProductLabel({produto,nome,codigo,foto=true}:{produto?:Produto;nome?:string;codigo?:string;foto?:boolean}){
 return <div className="es-product">{foto&&<div className="es-thumb">{produto?.ativo?<ProdutoFoto produtoId={String(produto.id)} editable={false}/>:<Package size={23}/>}</div>}<div><strong>{produto?.nome||nome||'Produto'}</strong><small>{produto?.codigoBarras||codigo||'Sem código de barras'}</small></div></div>;
}
function Pagination({total,page,size,onChange}:{total:number;page:number;size:number;onChange:(p:number)=>void}){
 const pages=Math.max(1,Math.ceil(total/size)),current=Math.min(page,pages);
 return <footer className="es-pages"><span>Exibindo {total?(current-1)*size+1:0} a {Math.min(current*size,total)} de {total} registros</span><div><button type="button" className="es-secondary" disabled={current<=1} onClick={()=>onChange(current-1)} aria-label="Página anterior"><ChevronLeft size={16}/></button>{Array.from({length:Math.min(5,pages)},(_,i)=>Math.max(1,Math.min(current-2,pages-4))+i).map(p=><button type="button" className="es-secondary" aria-current={p===current?'page':undefined} key={p} onClick={()=>onChange(p)}>{p}</button>)}<button type="button" className="es-secondary" disabled={current>=pages} onClick={()=>onChange(current+1)} aria-label="Próxima página"><ChevronRight size={16}/></button></div></footer>;
}
type InvStatus='ABERTO'|'FECHADO'|'CANCELADO';
type InvResumo={id:string;status:InvStatus;revisao:number;criadoEm:string;encerradoEm?:string|null;_count:{itens:number}};
type InvLote={loteId:number;numeroLote:string|null;validade:string|null;saldoInicial:number;contagem:number|null};
type InvItem={produtoId:number;nome:string;codigoBarras:string|null;saldoInicial:number;contagem:number|null;lotesConferencia?:InvLote[]|null};
type InvFicha=Omit<InvResumo,'_count'>&{itens:InvItem[];motivoEncerramento?:string|null};
const invStatus:Record<InvStatus,string>={ABERTO:'Em andamento',FECHADO:'Fechado',CANCELADO:'Cancelado'};
function InventarioPersistente({podeAjustar,gestor,lotesAtivos,onAtualizar}:{podeAjustar:boolean;gestor:boolean;lotesAtivos:boolean;onAtualizar:()=>void}){
 const [lista,setLista]=useState<InvResumo[]>([]);
 const [ficha,setFicha]=useState<InvFicha|null>(null);
 const [edicoes,setEdicoes]=useState<Record<number,string>>({});
 const [edicoesLote,setEdicoesLote]=useState<Record<string,string>>({});
 const [modo,setModo]=useState<'produtos'|'lotes'>('produtos');
 const [busca,setBusca]=useState(''),[filtro,setFiltro]=useState('todos'),[pagina,setPagina]=useState(1);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const [acao,setAcao]=useState<'fechar'|'cancelar'|null>(null),[motivo,setMotivo]=useState('');
 const lock=useRef(false);
 const loadLista=useCallback(async()=>{
  setLoading(true);setErro('');
  try{const r=await api.get<InvResumo[]>('/inventarios-estoque');setLista(r.data);}
  catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
 },[]);
 useEffect(()=>{if(podeAjustar)void loadLista();else setLoading(false);},[podeAjustar,loadLista]);
 const valido=(s:string)=>/^\d+$/.test(s)&&Number(s)<=2147483647;
 const pendentes=Object.entries(edicoes);
 const pendentesLote=Object.entries(edicoesLote);
 const totalEdicoes=pendentes.length+pendentesLote.length;
 const validoEdicoes=pendentes.every(([,v])=>valido(v));
 const validoLotes=pendentesLote.every(([,v])=>valido(v));
 const contados=ficha?.itens.filter(i=>i.contagem!==null)??[];
 const divergentes=contados.filter(i=>i.contagem!==i.saldoInicial);
 const rows=(ficha?.itens??[]).filter(i=>[i.nome,i.codigoBarras,i.produtoId].some(v=>normalize(v).includes(normalize(busca.trim())))&&(filtro==='todos'||(filtro==='pendentes'?i.contagem===null:i.contagem!==null&&i.contagem!==i.saldoInicial)));
 const lotesTodos=(ficha?.itens??[]).flatMap(i=>(i.lotesConferencia??[]).map(l=>({...l,produtoId:i.produtoId,nome:i.nome})));
 const lotesContados=lotesTodos.filter(l=>l.contagem!==null);
 const lotesRows=lotesTodos.filter(l=>[l.nome,l.numeroLote,l.loteId].some(v=>normalize(v).includes(normalize(busca.trim())))&&(filtro==='todos'||(filtro==='pendentes'?l.contagem===null:l.contagem!==null&&l.contagem!==l.saldoInicial)));
 const exibindoLotes=modo==='lotes'&&lotesAtivos;
 const totalRows=exibindoLotes?lotesRows.length:rows.length;
 const current=Math.min(pagina,Math.max(1,Math.ceil(totalRows/8)));
 const aberto=ficha?.status==='ABERTO';
 function confirmarSaida(){return !totalEdicoes||window.confirm('Descartar alterações ainda não salvas?');}
 function mostrar(nova:InvFicha){setFicha(nova);setEdicoes({});setEdicoesLote({});setModo('produtos');setBusca('');setFiltro('todos');setPagina(1);}
 async function operar(fn:()=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(true);setErro('');setSucesso('');
  try{await fn();}catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 async function abrir(id:string){if(!confirmarSaida())return;await operar(async()=>{mostrar((await api.get<InvFicha>('/inventarios-estoque/'+id)).data);});}
 async function criar(){await operar(async()=>{mostrar((await api.post<InvFicha>('/inventarios-estoque',{})).data);setSucesso('Inventário aberto. Salve as contagens durante a conferência.');});}
 async function salvar(){
  if(!ficha||!aberto||!pendentes.length||!validoEdicoes)return;
  if(pendentes.length>200){setErro('Salve até 200 contagens por vez.');return;}
  await operar(async()=>{const r=await api.post<InvFicha>('/inventarios-estoque/'+ficha.id+'/contagens',{revisao:ficha.revisao,itens:pendentes.map(([id,v])=>({produtoId:Number(id),contagem:Number(v)}))});setFicha(r.data);setEdicoes({});setSucesso('Contagens salvas no banco.');});
 }
 async function salvarLotes(){
  if(!ficha||!aberto||!lotesAtivos||!pendentesLote.length||!validoLotes||pendentesLote.length>200)return;
  await operar(async()=>{const r=await api.post<InvFicha>('/inventarios-estoque/'+ficha.id+'/lotes/contagens',{revisao:ficha.revisao,itens:pendentesLote.map(([key,v])=>{const [produtoId,loteId]=key.split(':').map(Number);return {produtoId,loteId,contagem:Number(v)};})});setFicha(r.data);setEdicoesLote({});setSucesso('Contagens por lote salvas.');});
 }
 async function encerrar(){
  if(!ficha||!acao||!gestor||!aberto||totalEdicoes||motivo.trim().length<3)return;
  await operar(async()=>{const r=await api.post<InvFicha>('/inventarios-estoque/'+ficha.id+'/'+acao,{revisao:ficha.revisao,motivo:motivo.trim()});setFicha(r.data);setAcao(null);setMotivo('');setSucesso(r.data.status==='FECHADO'?'Inventário fechado e ajustes registrados.':'Inventário cancelado sem ajuste de estoque.');onAtualizar();});
 }
 if(!podeAjustar)return <section className="es-panel es-empty"><ClipboardList size={30}/>Você não possui permissão de inventário.</section>;
 return <section className="es-panel es-inventory">
  <div className="es-list-title"><div><h2>{ficha?'Conferência física de estoque':'Inventários de estoque'}</h2><small>{ficha?invStatus[ficha.status]+' · '+dateTime(ficha.criadoEm):'Histórico e contagens armazenadas por empresa'}</small></div><div className="es-inventory-actions">{ficha?<><button type="button" className="es-secondary" disabled={busy} onClick={()=>{if(confirmarSaida()){setFicha(null);setEdicoes({});setEdicoesLote({});void loadLista();}}}>Voltar</button><button type="button" className="es-secondary" disabled={busy} onClick={()=>void abrir(ficha.id)}><RefreshCcw size={16}/> Atualizar</button></>:<><button type="button" className="es-secondary" disabled={loading||busy} onClick={()=>void loadLista()}><RefreshCcw size={16}/></button><button type="button" className="es-primary" disabled={loading||busy||lista.some(i=>i.status==='ABERTO')} onClick={()=>void criar()}><Plus size={16}/> Novo inventário</button></>}</div></div>
  <Notice message={erro} onClose={()=>setErro('')}/><Notice message={sucesso} success onClose={()=>setSucesso('')}/>
  {!ficha?<><div className="es-inventory-note"><ClipboardList size={18}/><span>Abra um inventário, salve a contagem por etapas e solicite o fechamento ao gestor. Realize a conferência em período sem movimentações.</span></div><div className="es-table-scroll">{loading?<div className="es-empty">Carregando inventários...</div>:<><table className="es-table"><thead><tr>{['Abertura','Produtos','Situação','Encerramento','Ação'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{lista.map(i=><tr key={i.id}><td>{dateTime(i.criadoEm)}</td><td>{fmt(i._count.itens)}</td><td><span className={'es-pill '+(i.status==='ABERTO'?'baixo':i.status==='FECHADO'?'normal':'neutral')}>{invStatus[i.status]}</span></td><td>{dateTime(i.encerradoEm)}</td><td><button type="button" className="es-secondary" disabled={busy} onClick={()=>void abrir(i.id)}>{i.status==='ABERTO'?'Continuar':'Consultar'}</button></td></tr>)}</tbody></table>{!lista.length&&!erro&&<div className="es-empty"><ClipboardList size={30}/>Nenhum inventário registrado.</div>}</>}</div></>:<>
   <div className="es-inventory-summary">{[['Produtos',ficha.itens.length],['Contados (salvos)',contados.length],['Pendentes',ficha.itens.length-contados.length],['Divergências',divergentes.length]].map(([n,v])=><div key={n}><small>{n}</small><strong>{v}</strong></div>)}</div>
   <div className="es-inventory-progress"><progress value={contados.length} max={Math.max(1,ficha.itens.length)}/><span>{Math.round(contados.length/Math.max(1,ficha.itens.length)*100)}% salvo</span></div>
   {lotesAtivos&&<div className="es-inventory-filters"><button type="button" className="es-secondary" aria-pressed={!exibindoLotes} onClick={()=>{setModo('produtos');setPagina(1);setBusca('');setFiltro('todos');}}>Produtos</button><button type="button" className="es-secondary" aria-pressed={exibindoLotes} onClick={()=>{setModo('lotes');setPagina(1);setBusca('');setFiltro('todos');}}>Conferência por lote ({lotesContados.length}/{lotesTodos.length})</button></div>}
   <div className="es-inventory-filters"><label className="es-search"><Search size={18}/><input aria-label="Buscar produto na contagem" placeholder={exibindoLotes?"Produto ou número do lote":"Nome ou código de barras"} value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1);}}/></label>{[['todos','Todos'],['pendentes','Pendentes'],['divergencias','Divergências']].map(([v,n])=><button type="button" key={v} className="es-secondary" aria-pressed={filtro===v} onClick={()=>{setFiltro(v);setPagina(1);}}>{n}</button>)}</div>
   {exibindoLotes?<><p className="es-inventory-note">Conte os lotes existentes separadamente. A soma dos lotes pode ser menor que o total físico (unidades sem lote), mas nunca superior. Novos lotes devem ser cadastrados antes de abrir o inventário.</p><div className="es-table-scroll"><table className="es-table"><thead><tr>{['Produto / lote','Validade','Saldo inicial','Contagem física','Diferença','Situação'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{lotesRows.slice((current-1)*8,current*8).map(l=>{const key=l.produtoId+':'+l.loteId;const edit=edicoesLote[key];const v=edit??(l.contagem===null?'':String(l.contagem));const ok=valido(v);const dif=ok?Number(v)-l.saldoInicial:0;return <tr key={key}><td><ProductLabel nome={l.nome} codigo={l.numeroLote||'Lote #'+l.loteId} foto={false}/></td><td>{dateOnly(l.validade)}</td><td>{fmt(l.saldoInicial)} un.</td><td>{aberto?<input className="es-count-input" type="number" min={0} max={2147483647} step={1} value={v} disabled={busy} aria-label={'Contagem do lote '+(l.numeroLote||l.loteId)} aria-invalid={edit!==undefined&&!ok} onChange={e=>{const value=e.target.value;setEdicoesLote(old=>{const next={...old};if(value===(l.contagem===null?'':String(l.contagem)))delete next[key];else next[key]=value;return next;});}}/>:l.contagem===null?'—':fmt(l.contagem)}</td><td className={ok?(dif<0?'es-red':dif>0?'es-amber':'es-green'):''}>{ok?(dif>0?'+':'')+fmt(dif):'—'}</td><td><span className={'es-pill '+(edit!==undefined?'baixo':!ok?'neutral':dif?'baixo':'normal')}>{edit!==undefined?'Não salvo':!ok?'Pendente':dif?'Divergente':'Conferido'}</span></td></tr>;})}</tbody></table>{!lotesRows.length&&<div className="es-empty">Nenhum lote encontrado nesta conferência.</div>}</div></>:<div className="es-table-scroll"><table className="es-table"><thead><tr>{['Produto','Saldo inicial','Contagem física (un.)','Diferença','Situação'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice((current-1)*8,current*8).map(i=>{const edit=edicoes[i.produtoId];const v=edit??(i.contagem===null?'':String(i.contagem));const ok=valido(v);const dif=ok?Number(v)-i.saldoInicial:0;return <tr key={i.produtoId}><td><ProductLabel nome={i.nome} codigo={i.codigoBarras??undefined} foto={false}/></td><td>{fmt(i.saldoInicial)} un.</td><td>{aberto?<input className="es-count-input" type="number" min={0} max={2147483647} step={1} value={v} disabled={busy} aria-label={'Contagem de '+i.nome} aria-invalid={edit!==undefined&&!ok} onChange={e=>{const value=e.target.value;setEdicoes(old=>{const next={...old};if(value===(i.contagem===null?'':String(i.contagem)))delete next[i.produtoId];else next[i.produtoId]=value;return next;});}}/>:i.contagem===null?'—':fmt(i.contagem)}</td><td className={ok?(dif<0?'es-red':dif>0?'es-amber':'es-green'):''}>{ok?(dif>0?'+':'')+fmt(dif):'—'}</td><td><span className={'es-pill '+(edit!==undefined?'baixo':!ok?'neutral':dif?'baixo':'normal')}>{edit!==undefined?'Não salvo':!ok?'Pendente':dif?'Divergente':'Conferido'}</span></td></tr>;})}</tbody></table>{!rows.length&&<div className="es-empty">Nenhum produto encontrado.</div>}</div>}
   <div className="es-list-footer"><Pagination total={totalRows} page={current} size={8} onChange={setPagina}/></div>
   {aberto&&<div className="es-inventory-footer"><small>{totalEdicoes} alteração(ões) não salva(s). Salve antes de sair.</small><div className="es-inventory-actions">{exibindoLotes?<button type="button" className="es-primary" disabled={busy||!pendentesLote.length||!validoLotes||pendentesLote.length>200} onClick={()=>void salvarLotes()}>Salvar lotes</button>:<button type="button" className="es-primary" disabled={busy||!pendentes.length||!validoEdicoes||pendentes.length>200} onClick={()=>void salvar()}>Salvar contagens</button>}{gestor&&<><button type="button" className="es-secondary" disabled={busy||Boolean(totalEdicoes)} onClick={()=>{setMotivo('');setAcao('cancelar');}}>Cancelar inventário</button><button type="button" className="es-primary" disabled={busy||Boolean(totalEdicoes)||contados.length!==ficha.itens.length||lotesContados.length!==lotesTodos.length||(!lotesAtivos&&lotesTodos.length>0)} onClick={()=>{setMotivo('');setAcao('fechar');}}>Aprovar e fechar</button></>}</div></div>}
   {ficha.motivoEncerramento&&<p className="es-inventory-note">Motivo do encerramento: {ficha.motivoEncerramento}</p>}
  </>}
  {acao&&<Modal title={acao==='fechar'?'Aprovar e fechar inventário':'Cancelar inventário'} onClose={()=>{if(!busy)setAcao(null);}}><form className="es-form" onSubmit={e=>{e.preventDefault();void encerrar();}}><p>{acao==='fechar'?'O sistema verificará os saldos e registrará os ajustes em uma única transação. Os lotes existentes também serão reconciliados. Contagens incompletas, inconsistentes ou saldos alterados serão bloqueados.':'O histórico será preservado e nenhum saldo será alterado.'}</p><Notice message={erro} onClose={()=>setErro('')}/><label>Justificativa<textarea required minLength={3} maxLength={500} value={motivo} disabled={busy} onChange={e=>setMotivo(e.target.value)}/></label><div className="es-form-footer"><button type="button" className="es-secondary" disabled={busy} onClick={()=>setAcao(null)}>Voltar</button><button type="submit" className="es-primary" disabled={busy||motivo.trim().length<3}>{busy?'Processando...':'Confirmar'}</button></div></form></Modal>}
 </section>;
}
export function EstoquePage(){
 const {user,modules}=useAuth();
 const podeAjustar=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'')||Boolean(user?.permissoes?.includes('ESTOQUE_AJUSTAR'));
 const lotesAtivos=hasModule(modules,'ESTOQUE_LOTES');
 const podeXml=hasModule(modules,routeModules['/estoque/importar-xml']);
 const [params,setParams]=useSearchParams();
 const filtro=params.get('filtro')||'todos';
 const [aba,setAba]=useState<Aba>('posicao');
 const [produtos,setProdutos]=useState<Produto[]>([]),[movs,setMovs]=useState<Linha[]>([]),[lotes,setLotes]=useState<Linha[]>([]);
 const [busca,setBusca]=useState(''),[categoria,setCategoria]=useState(''),[tipoFiltro,setTipoFiltro]=useState(''),[validade,setValidade]=useState('todos');
 const [inicio,setInicio]=useState(''),[fim,setFim]=useState(''),[pagina,setPagina]=useState(1),[size,setSize]=useState(8);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const [modal,setModal]=useState(false),[modalErro,setModalErro]=useState(''),[produtoId,setProdutoId]=useState(''),[tipo,setTipo]=useState('ENTRADA_COMPRA'),[quantidade,setQuantidade]=useState('1'),[motivo,setMotivo]=useState(''),[observacao,setObservacao]=useState('');
 const lock=useRef(false);
 const request=useRef(0);
 const load=useCallback(async()=>{
  const rev=++request.current;setLoading(true);setErro('');
  try{const p=await bebfy.produtos.listar();if(rev===request.current)setProdutos(p.filter(x=>x.ativo));
   if(aba==='movimentacoes'||aba==='perdas'){const m=await api.get<Linha[]>('/movimentacoes-estoque');if(rev===request.current)setMovs(m.data);}
   if(aba==='lotes'&&lotesAtivos){const l=await api.get<Linha[]>('/lotes');if(rev===request.current)setLotes(l.data);}
  }catch(e){if(rev===request.current)setErro(mensagemErro(e));}finally{if(rev===request.current)setLoading(false);}
 },[aba,lotesAtivos]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 useEffect(()=>{if(!lotesAtivos&&aba==='lotes')setAba('posicao');},[aba,lotesAtivos]);
 useEffect(()=>{setPagina(1);},[aba,busca,categoria,filtro,tipoFiltro,validade,inicio,fim,size]);
 const mapa=useMemo(()=>new Map(produtos.map(p=>[p.id,p])),[produtos]);
 const categorias=useMemo(()=>Array.from(new Set(produtos.map(p=>p.categoria?.nome).filter((v):v is string=>Boolean(v)))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[produtos]);
 const matches=(...vals:unknown[])=>vals.some(v=>normalize(v).includes(normalize(busca.trim())));
 const filtrados=produtos.filter(p=>(filtro==='todos'||(filtro==='baixo'?statusProduto(p)!=='normal':statusProduto(p)===filtro))&&(!categoria||p.categoria?.nome===categoria)&&matches(p.nome,p.id,p.codigoBarras,p.marca)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 const movimentos=movs.filter(m=>{
  if(aba==='perdas'&&!ehPerda(m.tipo))return false;
  const p=mapa.get(num(m.produtoId));const rel=m.produto as Linha|undefined;
  const d=new Date(text(m.criadoEm));const data=Number.isNaN(d.getTime())?'':dateKey(d);
  return (!inicio||data>=inicio)&&(!fim||data<=fim)&&(!tipoFiltro||m.tipo===tipoFiltro)&&matches(p?.nome,rel?.nome,m.produtoId,p?.codigoBarras,rel?.codigoBarras,m.motivo);
 }).sort((a,b)=>text(b.criadoEm).localeCompare(text(a.criadoEm)));
 const lotesFiltrados=lotes.filter(l=>{const p=mapa.get(num(l.produtoId));const rel=l.produto as Linha|undefined;return (validade==='todos'||statusLote(l)===validade)&&matches(p?.nome,rel?.nome,l.numeroLote,l.produtoId,p?.codigoBarras,rel?.codigoBarras);}).sort((a,b)=>text(a.dataVencimento||'9999').localeCompare(text(b.dataVencimento||'9999')));
 const total=aba==='posicao'?filtrados.length:(aba==='movimentacoes'||aba==='perdas')?movimentos.length:lotesFiltrados.length;
 const current=Math.min(pagina,Math.max(1,Math.ceil(total/size)));
 const slice=<T,>(rows:T[])=>rows.slice((current-1)*size,current*size);
 const selected=mapa.get(Number(produtoId));
 const q=num(quantidade);
 const saldoPrevisto=selected?selected.estoqueAtual+(saida(tipo)?-q:q):null;
 function setFiltro(v:string){const next=new URLSearchParams(params);if(v==='todos')next.delete('filtro');else next.set('filtro',v);setParams(next,{replace:true});}
 function trocarAba(v:Aba){setAba(v);setBusca('');setTipoFiltro('');setInicio('');setFim('');setPagina(1);setErro('');}
 function abrir(p?:Produto,t='ENTRADA_COMPRA'){if(!podeAjustar)return;setProdutoId(p?String(p.id):'');setTipo(t);setQuantidade('1');setMotivo('');setObservacao('');setModalErro('');setModal(true);}
 async function registrar(e:React.FormEvent){
  e.preventDefault();if(lock.current||!podeAjustar)return;
  if(!selected||!Number.isSafeInteger(q)||q<=0||!motivo.trim()){setModalErro('Selecione o produto, informe uma quantidade inteira positiva e o motivo.');return;}
  if(saida(tipo)&&q>selected.estoqueAtual){setModalErro('Estoque insuficiente para esta saída.');return;}
  lock.current=true;setBusy(true);setModalErro('');setSucesso('');
  try{await api.post('/movimentacoes-estoque',{produtoId:selected.id,tipo,quantidade:q,motivo:motivo.trim(),observacao:observacao.trim()});setModal(false);setSucesso('Movimentação registrada e saldo atualizado.');await load();}
  catch(e){setModalErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 const baixos=produtos.filter(p=>statusProduto(p)==='baixo').length;
 const zerados=produtos.filter(p=>statusProduto(p)==='zero').length;
 const custoCompleto=produtos.every(p=>p.estoqueAtual===0||(p.precoCusto!=null&&Number.isFinite(Number(p.precoCusto))&&Number(p.precoCusto)>=0));
 const valor=produtos.reduce((s,p)=>s+num(p.precoCusto)*p.estoqueAtual,0);
 const kpis=[{n:'Valor em estoque (custo)',v:custoCompleto?moeda(valor):'Indisponível',Icon:Wallet,c:'green'},{n:'Produtos cadastrados (ativos)',v:fmt(produtos.length),Icon:Boxes,c:'green'},{n:'Estoque baixo',v:fmt(baixos),Icon:AlertTriangle,c:'amber'},{n:'Sem estoque',v:fmt(zerados),Icon:PackageX,c:'red'}];
 return <div className="es-page">
  <header className="es-header"><span className="es-heading-icon"><Warehouse size={28}/></span><div className="es-heading"><h1>Gestão de Estoque e Inventário</h1><p>Controle operacional da distribuidora: saldos, contagens, movimentações e validade.</p></div><button type="button" className="es-secondary" disabled={busy||loading} aria-label="Atualizar estoque" title="Atualizar estoque" onClick={()=>void load()}><RefreshCcw size={17} className={loading?'animate-spin':''}/></button>{podeXml&&<Link to={tenantPath('estoque/importar-xml')} className="es-secondary"><FileUp size={17}/> Importar XML</Link>}{podeAjustar&&<button type="button" className="es-primary" onClick={()=>trocarAba('inventarios')} disabled={busy||loading||Boolean(erro)}><Plus size={19}/> Inventário</button>}</header>
  <Notice message={erro} onClose={()=>setErro('')}/><Notice message={sucesso} success onClose={()=>setSucesso('')}/>
  <section className="es-kpis">{kpis.map(k=><article className="es-panel es-kpi" key={k.n}><span className={'es-kpi-icon '+k.c}><k.Icon size={25}/></span><div><small>{k.n}</small><strong className={'es-'+k.c}>{loading||erro?'—':k.v}</strong></div></article>)}</section>
  <nav className="es-tabs" aria-label="Seções do estoque">{([{id:'posicao',n:'Estoque',Icon:Warehouse},{id:'inventarios',n:'Inventários',Icon:ClipboardList},{id:'movimentacoes',n:'Movimentações',Icon:History},{id:'perdas',n:'Perdas e avarias',Icon:Trash2},...(lotesAtivos?[{id:'lotes',n:'Lotes e validade',Icon:CalendarClock} as const]:[])] as const).map(t=><button type="button" key={t.id} aria-pressed={aba===t.id} onClick={()=>trocarAba(t.id)}><t.Icon size={19}/>{t.n}</button>)}</nav>
  {aba==='inventarios'?<InventarioPersistente podeAjustar={podeAjustar} lotesAtivos={lotesAtivos} gestor={['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'')} onAtualizar={()=>void load()}/>:<>
  <label className="es-search"><Search size={19}/><input aria-label="Pesquisar estoque" placeholder={aba==='lotes'?'Buscar produto, lote ou código...':'Buscar produto, código ou código de barras...'} value={busca} onChange={e=>setBusca(e.target.value)}/></label>
  {aba==='posicao'&&<div className="es-filters"><div className="es-filter-buttons">{[['todos','Todos'],['normal','Normal'],['baixo','Estoque baixo / zerado'],['zero','Sem estoque']].map(([v,n])=><button type="button" className="es-secondary" key={v} aria-pressed={filtro===v} onClick={()=>setFiltro(v)}>{n}</button>)}</div><select aria-label="Categoria" value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{categorias.map(c=><option key={c}>{c}</option>)}</select></div>}
  {(aba==='movimentacoes'||aba==='perdas')&&<div className="es-filters"><label>Tipo<select value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(labels).filter(([v])=>aba!=='perdas'||ehPerda(v)).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>De<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label><label>Até<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label><button type="button" className="es-secondary" onClick={()=>{setTipoFiltro('');setInicio('');setFim('');setBusca('');}}>Limpar filtros</button></div>}
  {aba==='lotes'&&lotesAtivos&&<div className="es-filters"><div className="es-filter-buttons">{[['todos','Todos'],['normal','Normal'],['avencer','A vencer (30 dias)'],['vencido','Vencidos'],['esgotado','Esgotados'],['sem-data','Sem validade']].map(([v,n])=><button type="button" className="es-secondary" key={v} aria-pressed={validade===v} onClick={()=>setValidade(v)}>{n}</button>)}</div><Link className="es-secondary" to={tenantPath('lotes')}>Gerenciar lotes</Link></div>}
  <div className={'es-workspace '+(aba==='posicao'?'es-workspace-position':'')}>
  <section className="es-panel es-list"><div className="es-list-title"><h2>{aba==='posicao'?'Posição atual de estoque':aba==='movimentacoes'?'Histórico de movimentações':aba==='perdas'?'Histórico de perdas e avarias':'Lotes e validade'}</h2><small>{total} registro(s)</small></div>
   {aba==='lotes'&&<p className="es-note">Quantidades registradas por lote. O saldo geral está na aba Posição de estoque.</p>}
   <div className="es-table-scroll">
    {loading?<div className="es-empty">Carregando estoque...</div>:aba==='posicao'?<table className="es-table"><thead><tr>{['Produto','Categoria','Disponível','Fardos completos','Mínimo','Situação',...(podeAjustar?['Ajustar']:[])].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{slice(filtrados).map(p=>{const s=statusProduto(p),pack=num(p.fardoQuantidade);return <tr key={p.id}><td><ProductLabel produto={p}/></td><td><span className="es-category">{p.categoria?.nome||'Sem categoria'}</span></td><td className={'es-qty es-'+(s==='zero'?'red':s==='baixo'?'amber':'green')}>{fmt(p.estoqueAtual)} <small>un.</small></td><td>{pack>1?<>{fmt(Math.floor(p.estoqueAtual/pack))}<small>{pack} un./fardo</small></>:'—'}</td><td>{fmt(p.estoqueMinimo)}</td><td><span className={'es-pill '+s}>● {s==='zero'?'Sem estoque':s==='baixo'?'Reposição':'Normal'}</span></td>{podeAjustar&&<td><button type="button" className="es-adjust" title="Movimentar produto" aria-label={'Movimentar '+p.nome} onClick={()=>abrir(p)}><ArrowLeftRight size={17}/></button></td>}</tr>;})}</tbody></table>:(aba==='movimentacoes'||aba==='perdas')?<table className="es-table"><thead><tr>{['Data / horário','Produto','Tipo','Quantidade','Motivo'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{slice(movimentos).map(m=>{const p=mapa.get(num(m.produtoId));const rel=m.produto as Linha|undefined;return <tr key={text(m.id)}><td>{dateTime(m.criadoEm)}</td><td><ProductLabel produto={p} nome={text(rel?.nome||m.produtoId)} codigo={text(rel?.codigoBarras)} foto={false}/></td><td><span className={'es-pill '+(saida(m.tipo)?'zero':'normal')}>{saida(m.tipo)?<ArrowUpFromLine size={13}/>:<ArrowDownToLine size={13}/>} {labels[text(m.tipo)]||text(m.tipo)}</span></td><td className={saida(m.tipo)?'es-red es-qty':'es-green es-qty'}>{saida(m.tipo)?'− ':'+ '}{fmt(m.quantidade)}</td><td className="es-reason">{text(m.motivo)||'—'}</td></tr>;})}</tbody></table>:lotesAtivos?<table className="es-table"><thead><tr>{['Produto','Lote','Quantidade registrada','Validade','Situação'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{slice(lotesFiltrados).map(l=>{const p=mapa.get(num(l.produtoId));const rel=l.produto as Linha|undefined;const s=statusLote(l);return <tr key={text(l.id)}><td><ProductLabel produto={p} nome={text(rel?.nome||l.produtoId)} codigo={text(rel?.codigoBarras)} foto={false}/></td><td>{text(l.numeroLote)||'—'}</td><td className="es-qty">{fmt(l.quantidade)} un.</td><td>{dateOnly(l.dataVencimento)}</td><td><span className={'es-pill '+(s==='vencido'?'zero':s==='avencer'?'baixo':s==='normal'?'normal':'neutral')}>● {{vencido:'Vencido',avencer:'A vencer',normal:'Normal',esgotado:'Esgotado','sem-data':'Sem validade'}[s]}</span></td></tr>;})}</tbody></table>:null}
    {!loading&&!total&&<div className="es-empty"><Package size={28}/><p>Nenhum registro encontrado.</p></div>}
   </div><div className="es-list-footer"><label>Itens por página <select value={size} onChange={e=>setSize(Number(e.target.value))}>{[8,16,24].map(n=><option key={n}>{n}</option>)}</select></label><Pagination total={total} page={current} size={size} onChange={setPagina}/></div>
  </section>
  {aba==='posicao'&&<aside className="es-aside">
   <section className="es-panel es-side-panel"><h2><AlertTriangle size={19} className="es-amber"/> Alertas de estoque</h2><button type="button" disabled={loading||Boolean(erro)} onClick={()=>setFiltro('zero')}><PackageX size={16} className="es-red"/><span>{loading||erro?'—':fmt(zerados)} produto(s) sem estoque</span><ChevronRight size={15}/></button><button type="button" disabled={loading||Boolean(erro)} onClick={()=>setFiltro('baixo')}><AlertTriangle size={16} className="es-amber"/><span>{loading||erro?'—':fmt(baixos)} produto(s) com estoque baixo (ver reposição)</span><ChevronRight size={15}/></button>{lotesAtivos&&<button type="button" onClick={()=>{setValidade('avencer');trocarAba('lotes');}}><CalendarClock size={16}/><span>Lotes a vencer (30 dias)</span><ChevronRight size={15}/></button>}</section>
   {podeAjustar&&<section className="es-panel es-side-panel"><h2><ArrowLeftRight size={19} className="es-green"/> Ações rápidas</h2><button type="button" disabled={loading||busy||Boolean(erro)} onClick={()=>abrir(undefined,'ENTRADA_COMPRA')}><ArrowDownToLine size={17}/><span>Entrada de mercadoria</span><ChevronRight size={15}/></button><button type="button" disabled={loading||busy||Boolean(erro)} onClick={()=>abrir(undefined,'AJUSTE_ENTRADA')}><ArrowLeftRight size={17}/><span>Ajuste de estoque</span><ChevronRight size={15}/></button><button type="button" disabled={loading||busy||Boolean(erro)} onClick={()=>abrir(undefined,'PERDA')}><Trash2 size={17} className="es-red"/><span>Registrar perda / avaria</span><ChevronRight size={15}/></button></section>}
  </aside>}
  {aba==='perdas'&&podeAjustar&&<div className="es-actions-row"><button type="button" className="es-primary" disabled={loading||busy||Boolean(erro)} onClick={()=>abrir(undefined,'PERDA')}><Plus size={17}/> Registrar perda / avaria</button></div>}
  </div></>}
  {modal&&<Modal title="Movimentar estoque" onClose={()=>{if(!busy)setModal(false);}}><form className="es-form" onSubmit={e=>void registrar(e)}><Notice message={modalErro} onClose={()=>setModalErro('')}/><label>Produto<select required disabled={busy} value={produtoId} onChange={e=>setProdutoId(e.target.value)}><option value="">Selecione o produto</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome} · {fmt(p.estoqueAtual)} un.</option>)}</select></label>
   {selected&&<div className="es-form-product"><ProductLabel produto={selected}/><div><small>Estoque atual</small><strong>{fmt(selected.estoqueAtual)} un.</strong></div></div>}
   <div className="es-form-fields"><label>Tipo de movimentação<select disabled={busy} value={tipo} onChange={e=>setTipo(e.target.value)}>{operacoes.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>Quantidade em unidades<input required type="number" min={1} step={1} max={saida(tipo)?selected?.estoqueAtual:undefined} disabled={busy} value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label></div>
   <label>Motivo<input required disabled={busy} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex.: conferência de inventário"/></label><label>Observações (opcional)<textarea rows={3} disabled={busy} value={observacao} onChange={e=>setObservacao(e.target.value)}/></label>
   {saldoPrevisto!==null&&<div className="es-preview"><span>Saldo previsto após movimentação</span><strong className={saldoPrevisto<0?'es-red':'es-green'}>{fmt(saldoPrevisto)} un.</strong></div>}
   <p className="es-note">Movimentação do saldo geral. Para entrada com lote e validade, utilize Gerenciar lotes.</p>
   <div className="es-form-footer"><button type="button" className="es-secondary" disabled={busy} onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="es-primary" disabled={busy||!selected||saldoPrevisto!==null&&saldoPrevisto<0}>{busy?'Registrando...':'Registrar movimentação'}</button></div>
  </form></Modal>}
 </div>;
}
