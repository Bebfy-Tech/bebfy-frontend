import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Coins, Eye, Lock, Plus, RefreshCcw, Search, ShoppingCart, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { bebfy } from '../services/bebfy';
import type { Caixa } from '../services/bebfy';
import type { Linha } from '../services/operacional';
import { dinheiro, mensagemErro, Modal, Notice, MoneyInput } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import './caixas-premium.css';

type Extrato={caixaId:string;status:string;saldoInicial:string|number;totalSuprimentos:number;totalSangrias:number;totalDinheiroVendas:number;totalVendas:number;quantidadeVendas:number;pagamentos:Record<string,number>;entregasPendentes:number;saldoFinalFisico?:number|string|null;quebraDeCaixa?:number|string|null;saldoParcialSistema:number;movimentacoes:Linha[]};
type Periodo='hoje'|'ontem'|'7dias'|'mes'|'personalizado';
type Acao='abrir'|'sangria'|'suprimento'|'fechar';
const PERIODOS:{id:Periodo;nome:string}[]=[{id:'hoje',nome:'Hoje'},{id:'ontem',nome:'Ontem'},{id:'7dias',nome:'Últimos 7 dias'},{id:'mes',nome:'Este mês'},{id:'personalizado',nome:'Personalizado'}];
const FORMAS=[['DINHEIRO','Dinheiro','#32dca0'],['PIX','Pix','#76baf5'],['CARTAO_DEBITO','Débito','#b18bea'],['CARTAO_CREDITO','Crédito','#fac36b'],['FIADO','Fiado','#f08095']];
const num=(v:unknown)=>Number(v)||0;
const day=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateTime=(v:unknown)=>v?new Date(String(v)).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const time=(v:unknown)=>v?new Date(String(v)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';
const nome=(c:Caixa)=>c.operador?.nome||'Operador';
function intervalo(periodo:Periodo,inicio:string,fim:string){
 const d=new Date();d.setHours(0,0,0,0);const end=day(d);
 if(periodo==='personalizado')return {inicio,fim};
 if(periodo==='ontem'){d.setDate(d.getDate()-1);return {inicio:day(d),fim:day(d)};}
 if(periodo==='7dias')d.setDate(d.getDate()-6);
 if(periodo==='mes')d.setDate(1);
 return {inicio:day(d),fim:end};
}
function Situacao({status}:{status:string}){return <span className={'cx-status '+(status==='ABERTO'?'aberto':'fechado')}>● {status==='ABERTO'?'Aberto':'Fechado'}</span>;}

export function CaixasPage(){
 const {user}=useAuth();
 const gestor=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'');
 const podeMovimentar=gestor||Boolean(user?.permissoes?.includes('CAIXA_MOVIMENTAR'));
 const podeFechar=gestor||Boolean(user?.permissoes?.includes('CAIXA_FECHAR'));
 const [caixas,setCaixas]=useState<Caixa[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const [periodo,setPeriodo]=useState<Periodo>('hoje'),[inicio,setInicio]=useState(()=>day(new Date())),[fim,setFim]=useState(()=>day(new Date()));
 const [busca,setBusca]=useState(''),[operador,setOperador]=useState(''),[situacao,setSituacao]=useState(''),[pagina,setPagina]=useState(1);
 const [id,setId]=useState<string|null>(null),[extrato,setExtrato]=useState<Extrato|null>(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState(''),[revision,setRevision]=useState(0);
 const [modal,setModal]=useState<Acao|null>(null),[modalError,setModalError]=useState('');
 const [saldoInicial,setSaldoInicial]=useState('0'),[saldoFinal,setSaldoFinal]=useState(''),[contar,setContar]=useState(false);
 const [valor,setValor]=useState(''),[categoria,setCategoria]=useState(''),[observacao,setObservacao]=useState('');
 const lock=useRef(false);
 const load=useCallback(async()=>{setLoading(true);setErro('');try{const r=await bebfy.caixa.listar();setCaixas(r);setRevision(v=>v+1);return r;}catch(e){setErro(mensagemErro(e));return null;}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const range=intervalo(periodo,inicio,fim);
 const invalid=periodo==='personalizado'&&(!inicio||!fim||inicio>fim);
 const operadores=useMemo(()=>Array.from(new Map(caixas.map(c=>[c.operadorId,nome(c)])).entries()).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),[caixas]);
 const filtrados=useMemo(()=>{if(invalid)return [];const q=busca.trim().toLocaleLowerCase('pt-BR');return caixas.filter(c=>{
  const d=new Date(c.abertoEm);if(Number.isNaN(d.getTime()))return false;const data=day(d);
  return data>=range.inicio&&data<=range.fim&&(!operador||c.operadorId===operador)&&(!situacao||c.status===situacao)&&(!q||[c.id,nome(c)].some(x=>x.toLocaleLowerCase('pt-BR').includes(q)));
 }).sort((a,b)=>new Date(b.abertoEm).getTime()-new Date(a.abertoEm).getTime());},[caixas,invalid,range.inicio,range.fim,busca,operador,situacao]);
 const caixaProprio=caixas.find(c=>c.status==='ABERTO'&&c.operadorId===user?.funcionarioId);
 const selecionado=caixas.find(c=>c.id===id);
 useEffect(()=>{setPagina(1);},[periodo,inicio,fim,busca,operador,situacao]);
 // Default to the operator's register or the first result; keep explicit selections when refreshing.
 useEffect(()=>{if(!id&&filtrados.length)setId(filtrados.find(c=>c.id===caixaProprio?.id)?.id??filtrados[0].id);},[filtrados,id,caixaProprio?.id]);
 useEffect(()=>{if(!id)return;let alive=true;setExtrato(null);setDetailError('');setDetailLoading(true);
  api.get<Extrato>('/caixa/'+encodeURIComponent(id)+'/extrato').then(r=>{if(alive)setExtrato(r.data);}).catch(e=>{if(alive)setDetailError(mensagemErro(e));}).finally(()=>{if(alive)setDetailLoading(false);});return()=>{alive=false;};
 },[id,revision]);
 const ex=extrato?.caixaId===id?extrato:null;
 const abertas=filtrados.filter(c=>c.status==='ABERTO');
 const kpis=[{n:'Caixas abertos',v:String(abertas.length),Icon:Wallet,c:'green'},{n:'Caixas fechados',v:String(filtrados.filter(c=>c.status==='FECHADO').length),Icon:Lock,c:'blue'},{n:'Total de vendas',v:dinheiro(filtrados.reduce((s,c)=>s+num(c.totalVendas),0)),Icon:ShoppingCart,c:'blue'},{n:'Saldo inicial em aberto',v:dinheiro(abertas.reduce((s,c)=>s+num(c.saldoInicial),0)),Icon:Banknote,c:'green'}];
 const size=8,pages=Math.max(1,Math.ceil(filtrados.length/size)),current=Math.min(pagina,pages),rows=filtrados.slice((current-1)*size,current*size);
 const selecionadoFora=Boolean(selecionado&&!filtrados.some(c=>c.id===id));
 function abrirModal(acao:Acao){setModalError('');setSaldoInicial('0');setSaldoFinal('');setContar(false);setValor('');setCategoria('');setObservacao('');setModal(acao);}
 async function salvar(e:React.FormEvent){e.preventDefault();if(!modal||lock.current)return;const acao=modal;const target=id;
  const v=Number(acao==='abrir'?saldoInicial:acao==='fechar'?saldoFinal:valor);
  if(acao==='abrir'&&(!user?.funcionarioId||caixaProprio||saldoInicial===''||!Number.isFinite(v)||v<0)){setModalError('Confira o operador e o saldo inicial.');return;}
  if(acao!=='abrir'&&(!target||!ex||ex.status!=='ABERTO')){setModalError('Selecione um caixa aberto e atualizado.');return;}
  if(acao==='fechar'&&(!podeFechar||(contar&&(saldoFinal===''||!Number.isFinite(v)||v<0)))){setModalError('Confira a permissão e o valor contado.');return;}
  if((acao==='sangria'||acao==='suprimento')&&(!podeMovimentar||!Number.isFinite(v)||v<=0||!categoria.trim())){setModalError('Informe valor positivo e motivo da movimentação.');return;}
  lock.current=true;setBusy(true);setModalError('');setSucesso('');
  try{
   if(acao==='abrir'){const c=await bebfy.caixa.abrir({operadorId:user!.funcionarioId!,saldoInicial:v});setId(c.id);setSucesso('Caixa aberto com sucesso.');}
   else if(acao==='fechar'){await bebfy.caixa.fechar(target!,contar?v:undefined);setSucesso(contar?'Caixa fechado com contagem registrada.':'Caixa fechado sem conferência física.');}
   else {await api.post('/caixa/'+encodeURIComponent(target!)+'/movimentacao',{tipo:acao==='sangria'?'SANGRIA':'SUPRIMENTO',valor:v,categoria:categoria.trim(),observacao:observacao.trim()});setSucesso('Movimentação registrada no caixa.');}
   // Do not repeat a committed operation if refreshing the statement fails.
   setModal(null);await load();
  }catch(e){setModalError(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 const pagamentos=FORMAS.map(([key,n,c])=>({n,c,v:num(ex?.pagamentos?.[key])}));
 const paymentTotal=pagamentos.reduce((s,p)=>s+Math.max(0,p.v),0);
 const active=ex?.status==='ABERTO'&&selecionado?.status==='ABERTO';
 return <div className="cx-page">
  <header className="cx-header"><Wallet size={33} className="cx-green"/><div className="cx-heading"><h1>Controle de Caixa</h1><p>Gerencie aberturas, movimentações e fechamentos.</p></div><button type="button" className="cx-secondary" disabled={loading||busy} onClick={()=>void load()} aria-label="Atualizar caixas" title="Atualizar caixas"><RefreshCcw size={17} className={loading?'animate-spin':''}/></button>{caixaProprio?<button className="cx-primary" type="button" disabled={busy} onClick={()=>setId(caixaProprio.id)}><Eye size={18}/> Ver meu caixa</button>:<button className="cx-primary" type="button" disabled={busy||loading||!user?.funcionarioId} onClick={()=>abrirModal('abrir')}><Plus size={19}/> Abrir meu caixa</button>}</header>
  <Notice message={erro} onClose={()=>setErro('')}/><Notice message={sucesso} success onClose={()=>setSucesso('')}/>
  <section className="cx-kpis" aria-label="Resumo dos caixas filtrados">{kpis.map(k=><article className="cx-panel cx-kpi" key={k.n}><k.Icon size={29} className={'cx-'+k.c}/><div><small>{k.n}</small><strong className={'cx-'+k.c}>{loading?'—':k.v}</strong></div></article>)}</section>
  <div className="cx-layout">
   <section className="cx-panel cx-history">
    <nav className="cx-periods" aria-label="Período de abertura">{PERIODOS.map(p=><button key={p.id} type="button" disabled={busy} aria-pressed={periodo===p.id} className="cx-secondary" onClick={()=>setPeriodo(p.id)}>{p.id==='personalizado'&&<CalendarDays size={13}/>} {p.nome}</button>)}</nav>
    {periodo==='personalizado'&&<div className="cx-dates"><label>De<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label><label>Até<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>{invalid&&<small className="cx-red">Intervalo inválido.</small>}</div>}
    <label className="cx-search"><Search size={19}/><input aria-label="Buscar caixa ou operador" placeholder="Buscar caixa ou operador..." value={busca} onChange={e=>setBusca(e.target.value)}/></label>
    <div className="cx-filters"><select aria-label="Operador" value={operador} onChange={e=>setOperador(e.target.value)}><option value="">Todos os operadores</option>{operadores.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select><select aria-label="Situação" value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="">Todas as situações</option><option value="ABERTO">Aberto</option><option value="FECHADO">Fechado</option></select></div>
    <div className="cx-history-card"><div className="cx-section-title"><h2>Histórico de caixas</h2><small>Por data de abertura</small></div><div className="cx-table-scroll"><table className="cx-table"><thead><tr>{['Operador','Abertura','Saldo inicial','Vendas','Situação','Extrato'].map(n=><th key={n}>{n}</th>)}</tr></thead><tbody>{rows.map(c=><tr key={c.id} className={id===c.id?'selected':''}><td><strong>{nome(c)}</strong></td><td>{time(c.abertoEm)}<small>{new Date(c.abertoEm).toLocaleDateString('pt-BR')}</small></td><td>{dinheiro(c.saldoInicial)}</td><td>{dinheiro(c.totalVendas)}</td><td><Situacao status={c.status}/></td><td><button type="button" disabled={busy} className="cx-eye" aria-label={'Ver extrato de '+nome(c)} aria-pressed={id===c.id} onClick={()=>setId(c.id)}><Eye size={17}/></button></td></tr>)}</tbody></table>{loading?<div className="cx-empty">Carregando caixas...</div>:!rows.length&&<div className="cx-empty">Nenhum caixa encontrado no período.</div>}</div>
    <footer className="cx-pagination"><span>Exibindo {filtrados.length?(current-1)*size+1:0} a {Math.min(current*size,filtrados.length)} de {filtrados.length} caixas</span><div><button type="button" className="cx-secondary" disabled={current<=1} onClick={()=>setPagina(current-1)} aria-label="Página anterior"><ChevronLeft size={15}/></button>{Array.from({length:Math.min(3,pages)},(_,i)=>Math.max(1,Math.min(current-1,pages-2))+i).map(n=><button type="button" className="cx-secondary" key={n} aria-current={current===n?'page':undefined} onClick={()=>setPagina(n)}>{n}</button>)}<button type="button" className="cx-secondary" disabled={current>=pages} onClick={()=>setPagina(current+1)} aria-label="Próxima página"><ChevronRight size={15}/></button></div></footer></div>
   </section>
   <section className="cx-panel cx-detail">
    <header className="cx-detail-header"><Wallet size={25} className="cx-green"/><div><h2>Extrato do caixa</h2>{selecionado&&<p>Operador: {nome(selecionado)} · Abertura: {dateTime(selecionado.abertoEm)}{selecionado.fechadoEm?' · Fechamento: '+dateTime(selecionado.fechadoEm):''}</p>}</div>{selecionado&&<Situacao status={ex?.status??selecionado.status}/>}</header>
    {selecionadoFora&&<p className="cx-note">O caixa selecionado está fora dos filtros atuais.</p>}
    <Notice message={detailError} onClose={()=>setDetailError('')}/>
    {detailLoading?<div className="cx-empty">Carregando extrato...</div>:!ex?<div className="cx-empty"><Wallet size={34}/><p>{detailError?'Não foi possível carregar o extrato.':'Selecione um caixa para consultar o extrato.'}</p>{id&&<button className="cx-secondary" type="button" onClick={()=>setRevision(v=>v+1)}>Atualizar extrato</button>}</div>:<>
    <div className="cx-detail-kpis">{[{n:'Total de vendas',v:dinheiro(ex.totalVendas),Icon:ShoppingCart,c:'green'},{n:'Saldo inicial',v:dinheiro(ex.saldoInicial),Icon:Banknote,c:'white'},{n:'Vendas em dinheiro',v:dinheiro(ex.totalDinheiroVendas),Icon:Coins,c:'white'},{n:'Suprimentos',v:dinheiro(ex.totalSuprimentos),Icon:ArrowDownLeft,c:'green'},{n:'Sangrias',v:dinheiro(ex.totalSangrias),Icon:ArrowUpRight,c:'red'},{n:'Vendas realizadas',v:String(ex.quantidadeVendas),Icon:BarChart3,c:'blue'}].map(k=><article key={k.n} className="cx-mini"><k.Icon size={24} className={'cx-'+k.c}/><div><small>{k.n}</small><strong className={'cx-'+k.c}>{k.v}</strong></div></article>)}</div>
    <div className="cx-balance"><Wallet size={34}/><div><small>Saldo esperado em dinheiro</small><strong>{dinheiro(ex.saldoParcialSistema)}</strong><p>Valor físico esperado na gaveta</p></div></div>
    {ex.status==='FECHADO'&&<div className="cx-count">{ex.saldoFinalFisico==null?<span>Fechado sem conferência física.</span>:<><span>Dinheiro contado: <b>{dinheiro(ex.saldoFinalFisico)}</b></span><span>Diferença: <b className={num(ex.quebraDeCaixa)<0?'cx-red':num(ex.quebraDeCaixa)>0?'cx-blue':'cx-green'}>{dinheiro(ex.quebraDeCaixa)}</b></span></>}</div>}
    <div className="cx-detail-panels">
     <section className="cx-inner"><h3>Formas de pagamento</h3><div className="cx-payments">{pagamentos.map(p=><div className="cx-payment" key={p.n}><span><i style={{background:p.c}}/>{p.n}</span><div className="cx-track"><div style={{background:p.c,width:(paymentTotal?Math.max(0,p.v)/paymentTotal*100:0)+'%'}}/></div><strong>{dinheiro(p.v)}</strong></div>)}<p className="cx-note">Somente dinheiro líquido de vendas acertadas compõe o saldo físico.</p>{ex.entregasPendentes>0&&<p className="cx-pending">Delivery pendente de acerto: {dinheiro(ex.entregasPendentes)}</p>}</div></section>
     <section className="cx-inner"><h3>Movimentações manuais</h3><div className="cx-table-scroll"><table className="cx-table cx-mov"><thead><tr><th>Horário</th><th>Motivo</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>{[...(ex.movimentacoes??[])].sort((a,b)=>String(b.criadoEm).localeCompare(String(a.criadoEm))).map(m=><tr key={String(m.id)}><td>{time(m.criadoEm)}<small>{m.criadoEm?new Date(String(m.criadoEm)).toLocaleDateString('pt-BR'):''}</small></td><td>{String(m.categoria??'—')}{m.observacao? <small>{String(m.observacao)}</small>:null}</td><td><span className={'cx-movement '+(m.tipo==='SANGRIA'?'out':'in')}>{m.tipo==='SANGRIA'?'Sangria':'Suprimento'}</span></td><td className={m.tipo==='SANGRIA'?'cx-red':'cx-green'}>{m.tipo==='SANGRIA'?'− ':'+ '}{dinheiro(m.valor)}</td></tr>)}</tbody></table>{!ex.movimentacoes?.length&&<div className="cx-empty">Sem movimentações manuais.</div>}</div></section>
    </div>
    {active&&<footer className="cx-actions">{podeMovimentar&&<><button type="button" className="cx-danger" disabled={busy} onClick={()=>abrirModal('sangria')}><ArrowUpRight size={21}/> Sangria</button><button type="button" className="cx-supply" disabled={busy} onClick={()=>abrirModal('suprimento')}><ArrowDownLeft size={21}/> Suprimento</button></>}{podeFechar&&<button type="button" className="cx-primary" disabled={busy||ex.entregasPendentes>0} onClick={()=>abrirModal('fechar')} title={ex.entregasPendentes>0?'Conclua os acertos de delivery antes de fechar.':undefined}><Lock size={19}/> Fechar caixa</button>}</footer>}
    {active&&ex.entregasPendentes>0&&<p className="cx-pending">Conclua os acertos de delivery antes de fechar o caixa.</p>}
    </>}
   </section>
  </div>
  {modal&&<Modal busy={busy} title={modal==='abrir'?'Abrir meu caixa':modal==='fechar'?'Fechar caixa':modal==='sangria'?'Registrar sangria':'Registrar suprimento'} onClose={()=>{if(!busy)setModal(null);}}><form className="cx-form" onSubmit={e=>void salvar(e)}><Notice message={modalError} onClose={()=>setModalError('')}/>
   {modal==='abrir'&&<label>Dinheiro inicial para troco (R$)<MoneyInput required disabled={busy} value={saldoInicial} onValue={setSaldoInicial}/></label>}
   {modal==='fechar'&&<><p>Confira o extrato antes de encerrar o turno.</p><div className="cx-form-summary"><div>Total de vendas <b>{dinheiro(ex?.totalVendas)}</b></div><div>Quantidade de vendas <b>{ex?.quantidadeVendas??0}</b></div><div>Saldo esperado em dinheiro <b className="cx-green">{dinheiro(ex?.saldoParcialSistema)}</b></div></div><label className="cx-checkbox"><input type="checkbox" checked={contar} disabled={busy} onChange={e=>setContar(e.target.checked)}/> Informar contagem física (opcional)</label>{contar&&<><label>Dinheiro contado (R$)<MoneyInput required disabled={busy} value={saldoFinal} onValue={setSaldoFinal}/></label>{saldoFinal!==''&&<p>Diferença estimada: <b>{dinheiro(num(saldoFinal)-num(ex?.saldoParcialSistema))}</b></p>}</>}<p className="cx-note">Sem contagem, será registrado somente o saldo calculado pelo sistema.</p></>}
   {(modal==='sangria'||modal==='suprimento')&&<><p>{modal==='sangria'?'Retirada de dinheiro da gaveta.':'Entrada manual de dinheiro na gaveta.'}</p><label>Valor (R$)<MoneyInput required disabled={busy} value={valor} onValue={setValor}/></label><label>Categoria / motivo<input required disabled={busy} value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder={modal==='sangria'?'Ex.: retirada de segurança':'Ex.: troco adicional'}/></label><label>Observação (opcional)<textarea rows={3} disabled={busy} value={observacao} onChange={e=>setObservacao(e.target.value)}/></label></>}
   <div className="cx-form-footer"><button type="button" className="cx-secondary" disabled={busy} onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className={modal==='sangria'?'cx-danger':'cx-primary'} disabled={busy}>{busy?'Processando...':modal==='abrir'?'Abrir caixa':modal==='fechar'?'Confirmar fechamento':'Registrar movimentação'}</button></div>
  </form></Modal>}
 </div>;
}
