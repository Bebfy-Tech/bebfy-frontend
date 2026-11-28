import {useEffect,useRef,useState} from 'react';
import {Download,ShieldCheck,FileSpreadsheet,AlertTriangle} from 'lucide-react';
import {api,getTenantSlug} from '../services/api';
import {mensagemErro,Notice} from './ui';
import axios from 'axios';
const opcoes=[
 {id:'produtos',nome:'Produtos',descricao:'Identificação, preços e situação cadastral.',periodo:false},
 {id:'estoque',nome:'Posição de estoque',descricao:'Saldo geral e estoque mínimo atuais.',periodo:false},
 {id:'lotes',nome:'Lotes e validade',descricao:'Quantidades por lote e datas de validade.',periodo:false},
 {id:'clientes',nome:'Clientes',descricao:'Nome, código, modalidade e saldo de crédito. Sem CPF, telefone ou endereço.',periodo:false},
 {id:'vendas',nome:'Vendas',descricao:'Totais, descontos, entrega e situação. Período pela data da venda.',periodo:true},
 {id:'itens-venda',nome:'Itens das vendas',descricao:'Produtos, quantidades e valores. Período pela data da venda.',periodo:true},
 {id:'contas-pagar',nome:'Contas a pagar',descricao:'Valores, baixas e situação. Período pelo vencimento.',periodo:true},
 {id:'contas-receber',nome:'Contas a receber',descricao:'Valores, baixas e situação. Período pelo vencimento.',periodo:true},
 {id:'auditoria',nome:'Auditoria',descricao:'Eventos registrados, sem detalhes brutos ou IPs. Período pela data do evento.',periodo:true},
] as const;
type Tipo=typeof opcoes[number]['id'];
const hojeBR=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function ExportacaoDistribuidora({onBusy}:{onBusy:(v:boolean)=>void}){
 const [tipo,setTipo]=useState<Tipo>('produtos'),[inicio,setInicio]=useState(()=>hojeBR().slice(0,7)+'-01'),[fim,setFim]=useState(hojeBR);
 const [ciente,setCiente]=useState(false),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const lock=useRef(false),abort=useRef<AbortController|null>(null),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;abort.current?.abort();onBusy(false);};},[onBusy]);
 const opcao=opcoes.find(o=>o.id===tipo)!;
 const dias=(Date.parse(fim+'T00:00:00Z')-Date.parse(inicio+'T00:00:00Z'))/86400000;
 const invalido=opcao.periodo&&(!inicio||!fim||!Number.isFinite(dias)||dias<0||dias>365);
 async function exportar(e:React.FormEvent){
  e.preventDefault();if(lock.current||!ciente||invalido)return;
  lock.current=true;setBusy(true);onBusy(true);setErro('');setSucesso('');
  const controller=new AbortController();abort.current=controller;
  const tenant=getTenantSlug(),token=localStorage.getItem('@Bebfy:token');
  try{
   const r=await api.post<Blob>('/configuracoes/exportacao',{tipo,...(opcao.periodo?{inicio,fim}:{})},{responseType:'blob',signal:controller.signal,timeout:30000});
   // Never download a response for a previous tenant or authenticated session.
   if(!active.current||tenant!==getTenantSlug()||token!==localStorage.getItem('@Bebfy:token'))return;
   if(!r.data.type.toLowerCase().includes('text/csv'))throw new Error('O servidor não retornou um arquivo CSV válido.');
   const url=URL.createObjectURL(r.data),a=document.createElement('a');a.href=url;a.download='bebfy-'+tipo+'-'+hojeBR()+'.csv';
   document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
   setSucesso('Arquivo gerado e enviado para download. A exportação foi registrada na auditoria.');setCiente(false);
  }catch(err){
   if(!active.current||axios.isCancel(err))return;
   let msg=mensagemErro(err);
   if(axios.isAxiosError(err)&&err.response?.data instanceof Blob){try{const parsed=JSON.parse(await err.response.data.text());msg=mensagemErro({response:{status:err.response.status,data:parsed}});}catch{/* fall back to generic message */}}
   if(active.current)setErro(msg);
  }finally{lock.current=false;if(active.current){setBusy(false);onBusy(false);}}
 }
 return <section className="cf-panel cf-export"><h2><Download size={20}/> Central de exportação</h2><p>Gere arquivos CSV compatíveis com Excel, somente com os dados da sua distribuidora. Cada arquivo gerado é registrado na auditoria.</p>
 <Notice message={erro} onClose={()=>setErro('')}/><Notice message={sucesso} success onClose={()=>setSucesso('')}/>
 <form className="cf-form" onSubmit={exportar}>
 <div className="cf-export-grid" role="group" aria-label="Dados para exportação">{opcoes.map(o=><button key={o.id} className="cf-export-option" type="button" aria-pressed={tipo===o.id} disabled={busy} onClick={()=>{setTipo(o.id);setCiente(false);setErro('');setSucesso('');}}><FileSpreadsheet size={21}/><span><strong>{o.nome}</strong><small>{o.descricao}</small></span></button>)}</div>
 {opcao.periodo?<div className="cf-grid"><label>Data inicial<input required type="date" disabled={busy} value={inicio} onChange={e=>{setInicio(e.target.value);setCiente(false);}}/></label><label>Data final<input required type="date" disabled={busy} value={fim} onChange={e=>{setFim(e.target.value);setCiente(false);}}/></label></div>:<p className="cf-note"><FileSpreadsheet size={16}/> Este arquivo representa a posição atual, sem filtro de período.</p>}
 {invalido&&<Notice message="Informe um período válido de até 366 dias."/>}
 <p className="cf-note"><AlertTriangle size={18}/> Limite por arquivo: 10.000 registros e 8 MB. Reduza o período quando necessário. Cadastros maiores exigem exportação assistida. Não é um backup restaurável.</p>
 <label className="cf-rule"><span><strong>Confirmo que vou armazenar o arquivo com segurança.</strong><small>O CSV pode conter dados comerciais e pessoais. Não compartilhe sem autorização.</small></span><input type="checkbox" checked={ciente} disabled={busy} onChange={e=>setCiente(e.target.checked)}/></label>
 <div className="cf-footer"><span><ShieldCheck size={15} style={{display:'inline'}}/> Acesso administrativo · CSV UTF-8</span><button className="cf-primary" disabled={busy||!ciente||invalido} type="submit"><Download size={17}/>{busy?'Gerando arquivo…':'Exportar '+opcao.nome}</button></div>
 </form></section>;
}
