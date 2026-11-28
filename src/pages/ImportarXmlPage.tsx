import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, FileCode2, FileCheck, FileUp, Package, PackageCheck, RefreshCcw, Search, ShieldAlert, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { tenantPath } from '../services/tenantUrls';
import { dinheiro, mensagemErro, Notice } from '../components/ui';
import { ProdutoFoto } from '../components/ProdutoFoto';
import './xml-premium.css';
import {useUnsavedChanges} from '../components/useUnsavedChanges';

interface ProdutoDisponivel {id:number;nome:string;codigoBarras:string|null;estoqueAtual:number;}
interface ItemXml {indice:number;codigo:string;ean:string|null;nome:string;ncm?:string|null;cest?:string|null;quantidade:number;valorUnitario:number;produtoSugeridoId:number|null;}
interface Preview {chave:string;numero:string;data:string;valor:number;fornecedor:{cnpj:string;razaoSocial:string};destinatarioCnpj:string;fornecedorExistente:{id:string;razaoSocial:string}|null;produtos:ProdutoDisponivel[];itens:ItemXml[];}
interface Resultado {numeroNota:string;itensImportados:number;contaPagarCriada:boolean;}
const STEPS=['Arquivo XML','Conferência','Produtos','Finalização'];
const formatDate=(value:string)=>new Date(value).toLocaleDateString('pt-BR');
const fmt=(value:number)=>value.toLocaleString('pt-BR');
const norm=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const cnpj=(v:string)=>v?.length===14?v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):v||'Não informado';
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime());
function ProductAssociation({item,products,value,busy,onChange}:{item:ItemXml;products:ProdutoDisponivel[];value:string;busy:boolean;onChange:(value:string)=>void}){
 const [query,setQuery]=useState('');
 const matches=products.filter(p=>String(p.id)===value||norm(p.nome+' '+(p.codigoBarras||'')).includes(norm(query.trim())));
 return <div className="bf-xml-association"><label>Pesquisar produto<input aria-label={'Pesquisar produto para '+item.nome} disabled={busy} placeholder="Nome ou código de barras" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Produto no Bebfy<select aria-label={'Associar '+item.nome} disabled={busy} value={value} onChange={e=>onChange(e.target.value)}><option value="">{matches.length?'Selecionar produto cadastrado...':'Nenhum produto encontrado'}</option>{matches.map(p=><option key={p.id} value={p.id}>{p.nome} · estoque: {p.estoqueAtual}</option>)}</select></label></div>;
}
export function ImportarXmlPage(){
 const {user}=useAuth();
 const permitido=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'')||Boolean(user?.permissoes?.includes('ESTOQUE_AJUSTAR'));
 const [step,setStep]=useState(1);
 const [xml,setXml]=useState(''),[nomeArquivo,setNomeArquivo]=useState(''),[bytes,setBytes]=useState(0);
 const [preview,setPreview]=useState<Preview|null>(null),[associacoes,setAssociacoes]=useState<Record<number,string>>({});
 const [criarConta,setCriarConta]=useState(true),[vencimento,setVencimento]=useState(''),[conferido,setConferido]=useState(false);
 const [busy,setBusy]=useState(false),[erro,setErro]=useState(''),[resultado,setResultado]=useState<Resultado|null>(null),[drag,setDrag]=useState(false);
 const [busca,setBusca]=useState(''),[pendentes,setPendentes]=useState(false),[pagina,setPagina]=useState(1);
 const {requestExit,confirmation}=useUnsavedChanges(Boolean(xml&&!resultado),busy);
 const fileRef=useRef<HTMLInputElement>(null),lock=useRef(false);
 const mapa=useMemo(()=>new Map((preview?.produtos??[]).map(p=>[String(p.id),p])),[preview]);
 const total=preview?.itens.length??0;
 const associados=preview?.itens.filter(i=>mapa.has(associacoes[i.indice])).length??0;
 const complete=total>0&&associados===total;
 const unidades=preview?.itens.reduce((s,i)=>s+i.quantidade,0)??0;
 const filtrados=(preview?.itens??[]).filter(i=>(!pendentes||!mapa.has(associacoes[i.indice]))&&[i.nome,i.codigo,i.ean,mapa.get(associacoes[i.indice])?.nome].some(v=>norm(v).includes(norm(busca.trim()))));
 const size=8,pages=Math.max(1,Math.ceil(filtrados.length/size)),current=Math.min(pagina,pages);
 function reset(){if(lock.current)return;setStep(1);setXml('');setNomeArquivo('');setBytes(0);setPreview(null);setAssociacoes({});setResultado(null);setErro('');setVencimento('');setCriarConta(true);setConferido(false);setBusca('');setPendentes(false);setPagina(1);if(fileRef.current)fileRef.current.value='';}
 async function fileSelected(file?:File){
  if(!file||lock.current||!permitido)return;
  if(!/\.xml$/i.test(file.name)||file.size>1000000||!file.size){setErro('Selecione um arquivo XML de até 1 MB.');return;}
  setErro('');setPreview(null);setResultado(null);setAssociacoes({});setXml('');setNomeArquivo('');setBytes(0);setStep(1);setConferido(false);
  lock.current=true;setBusy(true);
  try{const content=await file.text();setXml(content);setNomeArquivo(file.name);setBytes(file.size);}
  catch{setErro('Não foi possível abrir o arquivo selecionado.');}finally{lock.current=false;setBusy(false);}
 }
 async function analisar(atualizar=false){
  if(!xml.trim()||lock.current||!permitido)return;
  lock.current=true;setBusy(true);setErro('');setConferido(false);
  try{
   const p=(await api.post<Preview>('/estoque/importar-xml/previsualizar',{xml})).data;
   const ids=new Set(p.produtos.map(v=>String(v.id)));
   setAssociacoes(old=>Object.fromEntries(p.itens.map(i=>[i.indice,atualizar&&preview?.chave===p.chave&&ids.has(old[i.indice])?old[i.indice]:String(i.produtoSugeridoId??'')])));
   setPreview(p);setStep(atualizar?3:2);setPagina(1);
  }catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 function avancar(s:number){if(lock.current)return;setErro('');setConferido(false);setStep(s);}
 async function confirmar(){
  if(!preview||!complete||!conferido||lock.current||!permitido)return;
  if(criarConta&&!validDate(vencimento)){setErro('Informe a data de vencimento da despesa.');return;}
  lock.current=true;setBusy(true);setErro('');
  try{
   const data=(await api.post<Resultado>('/estoque/importar-xml/confirmar',{xml,mapeamentos:preview.itens.map(i=>({indice:i.indice,produtoId:Number(associacoes[i.indice])})),gerarContaPagar:criarConta,...(criarConta?{vencimento:new Date(vencimento+'T12:00:00').toISOString()}:{})})).data;
   setResultado(data);setPreview(null);setXml('');setAssociacoes({});setConferido(false);
  }catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 return <div className="xp-page">
  <header className="xp-header"><span className="xp-header-icon"><FileCode2 size={27}/></span><div className="xp-heading"><h1>Importação de XML</h1><p>Entrada de mercadorias por nota fiscal.</p></div><Link className="xp-secondary" to={tenantPath('estoque')}><ArrowLeft size={17}/> Voltar ao estoque</Link></header>
  <Notice message={erro} onClose={()=>setErro('')}/>
  {!permitido&&<div className="xp-panel xp-info"><ShieldAlert size={22}/> Seu usuário não possui permissão para movimentar o estoque e importar notas fiscais.</div>}
  {resultado?<section className="xp-panel xp-success" role="status"><CheckCircle2 size={55}/><h2>Nota {resultado.numeroNota} importada!</h2><p>{resultado.itensImportados} itens registrados no histórico e adicionados ao estoque.</p><p>{resultado.contaPagarCriada?'Conta a pagar criada no financeiro.':'Nenhuma conta a pagar foi criada.'}</p><div><Link className="xp-secondary" to={tenantPath('estoque')}>Ver estoque</Link><button className="xp-primary" type="button" onClick={reset}><FileUp size={18}/> Importar outra nota</button></div></section>:permitido&&<>
  <nav className="xp-steps" aria-label="Etapas da importação">{STEPS.map((s,i)=><div className={'xp-step '+(step===i+1?'current':step>i+1?'done':'')} key={s} aria-current={step===i+1?'step':undefined}><span className="xp-step-number">{step>i+1?<Check size={17}/>:i+1}</span><span>{s}</span></div>)}</nav>
  {step===1&&<section className="xp-panel xp-stage"><div className="xp-stage-heading"><h2>Selecione o XML da nota fiscal</h2><p>Escolha o arquivo recebido do fornecedor para iniciar a conferência.</p></div>
   <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" aria-label="Selecionar arquivo XML" className="sr-only" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)requestExit(()=>void fileSelected(file));e.currentTarget.value='';}}/>
   <div className={'xp-drop '+(drag?'drag':'')} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(!busy){if(e.dataTransfer.files.length!==1){setErro('Selecione apenas um arquivo XML.');return;}const file=e.dataTransfer.files[0];requestExit(()=>void fileSelected(file));}}}>
    <CloudUpload size={48}/><h3>Arraste seu arquivo XML aqui</h3><p>ou clique para selecionar</p><button type="button" className="xp-secondary" disabled={busy} onClick={()=>fileRef.current?.click()}>Selecionar arquivo</button><small>NF-e modelo 55 · Até 1 MB</small>
   </div>
   {nomeArquivo&&<div className="xp-file"><FileCode2 size={24}/><div><strong>{nomeArquivo}</strong><small>{fmt(Math.ceil(bytes/1024))} KB · Pronto para análise</small></div><CheckCircle2 size={20}/><button type="button" className="xp-icon" disabled={busy} aria-label="Remover arquivo" onClick={()=>requestExit(reset)}><X size={19}/></button></div>}
   <div className="xp-footer"><span/><button className="xp-primary" type="button" disabled={!xml||busy} onClick={()=>void analisar()}>{busy?'Processando...':'Analisar XML'} <ArrowRight size={17}/></button></div>
  </section>}
  {step===2&&preview&&<section className="xp-panel xp-stage"><div className="xp-invoice"><FileCheck size={32}/><div><h2>NF-e nº {preview.numero}</h2><p>Dados extraídos do arquivo XML · {nomeArquivo}</p></div></div>
   <div className="xp-invoice-grid">{[['Fornecedor',preview.fornecedor.razaoSocial],['Data de emissão',formatDate(preview.data)],['Itens da nota',fmt(total)+' itens'],['Valor total',dinheiro(preview.valor)]].map(([k,v],i)=><div className="xp-mini" key={k}><small>{k}</small><strong className={i===3?'xp-green':''}>{v}</strong></div>)}</div>
   <div className="xp-invoice-data"><div><small>CNPJ do fornecedor</small><b>{cnpj(preview.fornecedor.cnpj)}</b></div><div><small>CNPJ do destinatário</small><b>{cnpj(preview.destinatarioCnpj)}</b></div><div className="xp-key"><small>Chave de acesso</small><b>{preview.chave}</b></div></div>
   <div className="xp-checks"><p><CheckCircle2 size={17}/> Nota sem registro duplicado na análise.</p><p><CheckCircle2 size={17}/> {preview.fornecedorExistente?'Fornecedor identificado no cadastro.':'Fornecedor será cadastrado ao confirmar.'}</p><p><ShieldAlert size={17}/> Confira o CNPJ do destinatário. O backend compara com o cadastro da empresa quando há CNPJ informado.</p></div>
   <div className="xp-footer"><button className="xp-secondary" type="button" disabled={busy} onClick={()=>avancar(1)}><ArrowLeft size={17}/> Voltar</button><button type="button" className="xp-primary" disabled={busy} onClick={()=>avancar(3)}>Conferir produtos <ArrowRight size={17}/></button></div>
  </section>}
  {step===3&&preview&&<section className="xp-panel xp-stage"><div className="xp-stage-heading"><h2>Conferência de produtos</h2><p>Confirme os produtos sugeridos pelo código de barras ou escolha o correspondente no cadastro.</p></div>
   <div className="xp-progress"><div><strong>{associados} de {total} itens associados</strong><span className={complete?'xp-green':'xp-amber'}>{complete?'Todos associados':(total-associados)+' pendente(s)'}</span></div><div className="xp-track" role="progressbar" aria-label="Itens associados" aria-valuemin={0} aria-valuemax={Math.max(total,1)} aria-valuenow={associados}><div style={{width:(total?associados/total*100:0)+'%'}}/></div></div>
   <div className="xp-tools"><label className="xp-search"><Search size={17}/><input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1);}} placeholder="Buscar item, EAN ou produto..." aria-label="Buscar itens da nota"/></label><button type="button" className="xp-secondary" aria-pressed={pendentes} onClick={()=>{setPendentes(p=>!p);setPagina(1);}}>Somente pendentes</button><Link className="xp-secondary" target="_blank" rel="noopener noreferrer" to={tenantPath('produtos')}>Cadastrar produto</Link><button type="button" className="xp-secondary" disabled={busy} onClick={()=>void analisar(true)} title="Atualizar produtos após cadastro"><RefreshCcw size={16}/> Atualizar produtos</button></div>
   <div className="xp-items">{filtrados.slice((current-1)*size,current*size).map(item=>{const p=mapa.get(associacoes[item.indice]);return <article key={item.indice} className={'xp-item '+(!p?'pending':'')}><div className="xp-item-photo">{p?<ProdutoFoto produtoId={String(p.id)} editable={false}/>:<Package size={25}/>}</div><div className="xp-item-info"><strong>{item.nome}</strong><small>Item {item.indice+1} · Código: {item.codigo||'—'} · EAN: {item.ean||'—'}</small><small>NCM: {item.ncm||'—'} · CEST: {item.cest||'—'}</small></div><div className="xp-item-qty"><strong>{fmt(item.quantidade)} qtd. XML</strong><small>{dinheiro(item.valorUnitario)} / qtd. XML</small></div><div className="xp-item-map"><ProductAssociation item={item} products={preview.produtos} value={associacoes[item.indice]||''} busy={busy} onChange={value=>{setAssociacoes(a=>({...a,[item.indice]:value}));setConferido(false);}}/><small className={p?'xp-green':'xp-amber'}>{p?'Associado · confira a unidade':'Associação pendente'}</small></div>{p?<CheckCircle2 className="xp-green" size={19}/>:<ShieldAlert className="xp-amber" size={19}/>}</article>;})}{!filtrados.length&&<div className="xp-empty">Nenhum item encontrado com os filtros atuais.</div>}</div>
   <div className="xp-pagination"><span>{filtrados.length?((current-1)*size+1):0}–{Math.min(current*size,filtrados.length)} de {filtrados.length} itens</span><div><button type="button" className="xp-secondary" disabled={current<=1||busy} onClick={()=>setPagina(current-1)} aria-label="Página anterior"><ChevronLeft size={17}/></button><span>{current} / {pages}</span><button type="button" className="xp-secondary" disabled={current>=pages||busy} onClick={()=>setPagina(current+1)} aria-label="Próxima página"><ChevronRight size={17}/></button></div></div>
   <p className="xp-note">NCM e CEST são apenas para conferência. A quantidade do XML será somada diretamente ao estoque; não há conversão automática de caixas ou fardos. Se a unidade comercial não corresponder à unidade de estoque, não confirme esta nota.</p>
   <div className="xp-footer"><button type="button" className="xp-secondary" disabled={busy} onClick={()=>avancar(2)}><ArrowLeft size={17}/> Voltar</button><button type="button" className="xp-primary" disabled={!complete||busy} onClick={()=>avancar(4)}>Finalizar conferência <ArrowRight size={17}/></button></div>
  </section>}
  {step===4&&preview&&<section className="xp-panel xp-stage"><div className="xp-stage-heading"><h2>Resumo da importação</h2><p>Revise os dados antes de efetivar a entrada da mercadoria.</p></div>
   <div className="xp-summary-grid"><section className="xp-inner"><h3><PackageCheck size={20}/> Dados da nota</h3><div className="xp-summary-line"><span>NF-e</span><b>{preview.numero}</b></div><div className="xp-summary-line"><span>Itens associados</span><b>{associados} de {total}</b></div><div className="xp-summary-line"><span>Quantidade total informada no XML</span><b>{fmt(unidades)}</b></div><div className="xp-summary-line"><span>Fornecedor</span><b>{preview.fornecedor.razaoSocial}</b></div><div className="xp-total"><small>Valor total da nota fiscal</small><strong>{dinheiro(preview.valor)}</strong></div></section>
   <section className="xp-inner"><h3><Wallet size={20}/> Financeiro</h3><label className="xp-check-label"><input type="checkbox" disabled={busy} checked={criarConta} onChange={e=>{setCriarConta(e.target.checked);setConferido(false);}}/> Gerar conta a pagar no financeiro</label>{criarConta?<label className="xp-date">Vencimento da conta<input type="date" disabled={busy} required value={vencimento} onChange={e=>{setVencimento(e.target.value);setConferido(false);}}/><small>Valor da conta: {dinheiro(preview.valor)}</small></label>:<p className="xp-note">Somente o estoque e o registro da nota serão atualizados; nenhuma conta a pagar será criada.</p>}</section></div>
   <div className="xp-warning"><ShieldAlert size={22}/><div><strong>Conferência obrigatória</strong><p>A importação não consulta a SEFAZ nem valida a autenticidade fiscal. Confirme emitente, destinatário, valores e unidades. O sistema não converte caixas ou fardos e não cria lotes ou altera preços automaticamente.</p><label className="xp-check-label"><input type="checkbox" checked={conferido} disabled={busy} onChange={e=>setConferido(e.target.checked)}/> Conferi os dados, os produtos e a equivalência das unidades de estoque.</label></div></div>
   <div className="xp-footer"><button className="xp-secondary" type="button" disabled={busy} onClick={()=>avancar(3)}><ArrowLeft size={17}/> Voltar</button><button className="xp-primary" type="button" disabled={!complete||!conferido||busy||(criarConta&&!validDate(vencimento))} onClick={()=>void confirmar()}><PackageCheck size={18}/> {busy?'Importando...':'Confirmar importação'}</button></div>
  </section>}
  <div className="xp-info"><ShieldAlert size={18}/><span>Nenhuma alteração no estoque é realizada antes da confirmação. Sem integração com a SEFAZ.</span></div>
  </>}
 {confirmation}
 </div>;
}
