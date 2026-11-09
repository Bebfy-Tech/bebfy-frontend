import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileCode2, FileUp, Link2, PackageCheck, ShieldAlert, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { tenantPath } from '../services/tenantUrls';
import { btn, card, dinheiro, input, mensagemErro, Notice, secondary } from '../components/ui';

interface ProdutoDisponivel { id:number; nome:string; codigoBarras:string|null; estoqueAtual:number; }
interface ItemXml { indice:number; codigo:string; ean:string|null; nome:string; quantidade:number; valorUnitario:number; produtoSugeridoId:number|null; }
interface Preview {
 chave:string; numero:string; data:string; valor:number;
 fornecedor:{cnpj:string;razaoSocial:string};
 destinatarioCnpj:string;
 fornecedorExistente:{id:string;razaoSocial:string}|null;
 produtos:ProdutoDisponivel[];
 itens:ItemXml[];
}
const formatDate=(value:string)=>new Date(value).toLocaleDateString('pt-BR');
export function ImportarXmlPage() {
 const [xml,setXml]=useState('');
 const [nomeArquivo,setNomeArquivo]=useState('');
 const [preview,setPreview]=useState<Preview|null>(null);
 const [associacoes,setAssociacoes]=useState<Record<number,string>>({});
 const [criarConta,setCriarConta]=useState(true);
 const [vencimento,setVencimento]=useState('');
 const [busy,setBusy]=useState(false);
 const [erro,setErro]=useState('');
 const [resultado,setResultado]=useState<{numeroNota:string;itensImportados:number;contaPagarCriada:boolean}|null>(null);
 const complete=useMemo(()=>Boolean(preview)&&preview!.itens.every(item=>Number(associacoes[item.indice])>0),[preview,associacoes]);
 async function fileSelected(file?:File){
   if(!file)return;
   setErro('');setPreview(null);setResultado(null);setAssociacoes({});
   if(!/\.xml$/i.test(file.name)||file.size>1000000||!file.size){setErro('Selecione um arquivo XML de até 1 MB.');return;}
   try {setXml(await file.text());setNomeArquivo(file.name);}
   catch {setErro('Não foi possível abrir o arquivo selecionado.');}
 }
 async function analisar(){
   if(!xml.trim())return;
   setBusy(true);setErro('');
   try{
     const p=(await api.post<Preview>('/estoque/importar-xml/previsualizar',{xml})).data;
     setPreview(p);setAssociacoes(Object.fromEntries(p.itens.map(i=>[i.indice,String(i.produtoSugeridoId??'')])));
   }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
 }
 async function confirmar(){
   if(!preview||!complete||busy)return;
   if(criarConta&&!vencimento){setErro('Informe a data de vencimento da despesa.');return;}
   setBusy(true);setErro('');
   try{
     const data=(await api.post<{numeroNota:string;itensImportados:number;contaPagarCriada:boolean}>('/estoque/importar-xml/confirmar',{
       xml,
       mapeamentos:preview.itens.map(i=>({indice:i.indice,produtoId:Number(associacoes[i.indice])})),
       gerarContaPagar:criarConta,
       ...(criarConta?{vencimento:new Date(vencimento+'T12:00:00').toISOString()}:{}),
     })).data;
     setResultado(data);setPreview(null);setXml('');
   }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
 }
 return <main className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-400">ESTOQUE / COMPRAS</p><h1 className="mt-2 text-3xl font-black text-white">Importar nota fiscal XML</h1><p className="mt-2 text-sm text-slate-400">Importe uma NF-e modelo 55 a partir do XML fornecido pelo fornecedor, sem consultar a SEFAZ.</p></div>
   <Link to={tenantPath('estoque')} className={secondary}><ArrowLeft size={17}/> Voltar ao estoque</Link>
  </div>
  <Notice message={erro} onClose={()=>setErro('')}/>
  {resultado&&<section className={`${card} border-emerald-500/30 p-7`} role="status">
    <CheckCircle2 size={37} className="text-emerald-400"/>
    <h2 className="mt-3 text-xl font-extrabold">Nota {resultado.numeroNota} importada!</h2>
    <p className="mt-2 text-sm text-slate-400">{resultado.itensImportados} itens registrados no histórico e somados ao estoque. {resultado.contaPagarCriada?'Despesa criada em contas a pagar.':'Nenhuma despesa foi criada.'}</p>
    <button className={`${btn} mt-5`} onClick={()=>{setResultado(null);setNomeArquivo('');setVencimento('');}}>Importar outra nota</button>
  </section>}
  {!resultado&&<>
   <section className={`${card} p-6 sm:p-8`}>
    <div className="mb-5 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><FileUp size={24}/></span><div><h2 className="text-lg font-extrabold">1. Selecione seu XML</h2><p className="text-xs text-slate-400">Arquivo NF-e autorizado ou recebido do fornecedor (.xml, até 1 MB)</p></div></div>
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#304660] bg-[#101829] px-5 py-8 text-center transition hover:border-blue-500">
     <FileCode2 size={31} className="text-blue-300"/>
     <strong className="text-sm">{nomeArquivo||'Clique para escolher o arquivo XML'}</strong>
     <span className="text-xs text-slate-400">O conteúdo só será importado após sua confirmação.</span>
     <input aria-label="Selecionar arquivo XML" type="file" accept=".xml,text/xml,application/xml" className="sr-only" onChange={e=>void fileSelected(e.target.files?.[0])}/>
    </label>
    <button type="button" className={`${btn} mt-5 w-full sm:w-auto`} disabled={!xml||busy} onClick={()=>void analisar()}>
      <FileCode2 size={17}/> {busy?'Analisando…':'Analisar XML'} <ArrowRight size={17}/>
    </button>
   </section>
   {preview&&<>
    <section className={`${card} p-6`}>
     <h2 className="text-lg font-extrabold">2. Confira a nota e o fornecedor</h2>
     <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Número da NF-e',preview.numero],['Emitente',preview.fornecedor.razaoSocial],['Emissão',formatDate(preview.data)],['Valor da nota',dinheiro(preview.valor)]].map(([k,v])=><div key={k} className="rounded-xl border border-[#27364c] bg-[#101829] p-4"><p className="text-xs text-slate-400">{k}</p><strong className="mt-2 block text-sm">{v}</strong></div>)}
     </div>
     <p className="mt-4 break-all text-xs text-slate-500">Chave: {preview.chave} · CNPJ fornecedor: {preview.fornecedor.cnpj}</p>
    </section>
    <section className={`${card} p-5 sm:p-6`}>
     <div className="flex items-center gap-2"><Link2 className="text-emerald-300"/><h2 className="text-lg font-extrabold">3. Associe os produtos (De-Para)</h2></div>
     <p className="mt-2 text-sm text-slate-400">Confira cada item da nota e escolha seu produto correspondente. Produtos não encontrados precisam ser cadastrados antes de finalizar.</p>
     <div className="mt-5 space-y-3">{preview.itens.map(item=><div key={item.indice} className="grid gap-3 rounded-xl border border-[#2a384c] bg-[#101829] p-4 lg:grid-cols-[1fr_40px_1fr] lg:items-center">
      <div><strong className="block text-sm">{item.nome}</strong><p className="mt-1 text-xs text-slate-400">{item.quantidade} unidade(s) · {dinheiro(item.valorUnitario)} / un. · EAN {item.ean||'não informado'}</p></div>
      <ArrowRight size={18} className="hidden text-blue-300 lg:block"/>
      <select aria-label={`Associar produto ${item.nome}`} required className={input} value={associacoes[item.indice]||''} onChange={e=>setAssociacoes(a=>({...a,[item.indice]:e.target.value}))}>
       <option value="">Escolher produto cadastrado...</option>
       {preview.produtos.map(p=><option key={p.id} value={p.id}>{p.nome} · estoque: {p.estoqueAtual}</option>)}
      </select>
     </div>)}</div>
     <Link to={tenantPath('produtos')} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-300">Cadastrar produto que está faltando <ArrowRight size={16}/></Link>
    </section>
    <section className={`${card} p-6`}>
     <div className="flex items-center gap-3"><Wallet size={23} className="text-emerald-300"/><h2 className="text-lg font-extrabold">4. Financeiro e confirmação</h2></div>
     <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={criarConta} onChange={e=>setCriarConta(e.target.checked)}/> Criar conta a pagar no valor da NF-e ({dinheiro(preview.valor)})</label>
     {criarConta&&<label className="mt-4 block max-w-xs text-sm font-semibold">Vencimento da conta<input className={`${input} mt-2`} type="date" required value={vencimento} onChange={e=>setVencimento(e.target.value)}/></label>}
     <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-amber-200"><ShieldAlert size={17} className="shrink-0"/> A importação não verifica autenticidade ou situação da nota na SEFAZ. Confira emitente, destinatário, itens, quantidades e valores antes de confirmar. Estoque e financeiro serão alterados.</p>
     <button type="button" className={`${btn} mt-6 w-full sm:w-auto`} disabled={!complete||busy||(criarConta&&!vencimento)} onClick={()=>void confirmar()}>
      <PackageCheck size={18}/> {busy?'Importando…':'Confirmar e importar NF-e'}
     </button>
    </section>
   </>}
  </>}
 </main>;
}
