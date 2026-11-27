import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarClock, Check, ChevronLeft, ChevronRight, Clock, Eye, Grid2X2, Package, Pencil, Plus, RefreshCcw, Save, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasModule } from '../services/moduleAccess';
import { api } from '../services/api';
import { definicoes, montarDados, recursoApi, valor } from '../services/operacional';
import type { Campo, Linha, Valores } from '../services/operacional';
import { dinheiro, dataBR, mensagemErro, MoneyInput, Modal, Notice } from '../components/ui';
import { ProdutoFoto } from '../components/ProdutoFoto';
import './produtos-premium.css';

const campos=definicoes.produtos.fields;
const metadados={marca:120,fabricante:160,grupo:120,subgrupo:120,descricaoComplementar:2000,ncm:8,cest:7} as const;
const limite=(key:string)=>metadados[key as keyof typeof metadados];
type Filtro='todos'|'ativos'|'inativos'|'baixo'|'validade';
type Aba='identificacao'|'comercial'|'estoque'|'historico';
const num=(v:unknown)=>Number(v)||0;
const baixo=(p:Linha)=>Boolean(p.ativo)&&num(p.estoqueAtual)<=num(p.estoqueMinimo);
const vencendo=(p:Linha)=>Boolean(p.ativo)&&Array.isArray(p.lotes)&&p.lotes.some((l:Linha)=>{
  if(!l.dataVencimento||num(l.quantidade)<=0)return false;
  const hoje=new Date();hoje.setHours(0,0,0,0);const fim=new Date(hoje);fim.setDate(fim.getDate()+31);
  const d=new Date(String(l.dataVencimento));return d>=hoje&&d<fim;
});
const margem=(p:Linha|Valores)=>num(p.precoVendaVarejo)>0?(num(p.precoVendaVarejo)-num(p.precoCusto))/num(p.precoVendaVarejo)*100:null;
const percent=(v:number|null)=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const inicial=():Valores=>Object.fromEntries(campos.map(c=>[c.key,c.type==='checkbox'?false:c.key==='unidadeMedida'?'UN':c.key==='fardoQuantidade'?1:'']));
const draftOf=(p:Linha):Valores=>Object.fromEntries(campos.map(c=>{const v=p[c.key];return [c.key,typeof v==='boolean'?v:String(v??'')] as const;}));
const show=(v:unknown)=>v==null||v===''?'—':String(v);

function ProductField({campo,draft,categories,change,disabled=false}:{campo:Campo;draft:Valores;categories:Linha[];change:(key:string,v:string|boolean)=>void;disabled?:boolean}){
 const key=campo.key;const id='produto-'+key;const val=draft[key];
 return <label className={'bp-field '+(key==='nome'||campo.span?'bp-name':'')} htmlFor={id}><span>{campo.label}{campo.required&&<b className="bp-required"> *</b>}</span>
 {campo.type==='checkbox'?<div className="bp-check"><input id={id} type="checkbox" checked={Boolean(val)} disabled={disabled} onChange={e=>change(key,e.target.checked)}/>{val?'Sim':'Não'}</div>:
 campo.type==='select'?<select id={id} value={String(val??'')} onChange={e=>change(key,e.target.value)} disabled={disabled} required={campo.required}><option value="">Selecione...</option>{(campo.resource==='categorias'?categories.map(c=>({value:String(c.id),label:String(c.nome)})):campo.options??[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:
 campo.type==='number'&&campo.label.includes('(R$)')?<MoneyInput id={id} value={String(val??'')} onValue={v=>change(key,v)} required={campo.required} disabled={disabled}/>:
 campo.type==='textarea'?<textarea id={id} rows={3} maxLength={limite(key)} value={String(val??'')} onChange={e=>change(key,e.target.value)} disabled={disabled}/>:
 key==='ncm'||key==='cest'?<input id={id} type="text" inputMode="numeric" maxLength={limite(key)} placeholder={key==='ncm'?'8 dígitos':'7 dígitos'} value={String(val??'')} onChange={e=>change(key,e.target.value.replace(/\D/g,'').slice(0,limite(key)))} disabled={disabled}/>:
 <input id={id} maxLength={limite(key)} type={campo.type||'text'} value={String(val??'')} onChange={e=>change(key,e.target.value)} required={campo.required} disabled={disabled} min={campo.type==='number'?0:undefined} step={campo.step??(campo.type==='number'?1:undefined)}/>}
 </label>;
}

export function ProdutosPage(){
 const {user,modules}=useAuth();
 const canManage=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'')||Boolean(user?.permissoes?.includes('PRODUTOS_GERENCIAR'));
 const lotesAtivos=hasModule(modules,'ESTOQUE_LOTES');
 const cascosAtivos=hasModule(modules,'VASILHAMES_RETORNAVEIS');
 const [items,setItems]=useState<Linha[]>([]),[categories,setCategories]=useState<Linha[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[success,setSuccess]=useState('');
 const [busca,setBusca]=useState(''),[filtro,setFiltro]=useState<Filtro>('todos'),[categoria,setCategoria]=useState(''),[ordem,setOrdem]=useState('nome');
 const [page,setPage]=useState(1),[size,setSize]=useState(8);
 const [selected,setSelected]=useState<Linha|null>(null),[draft,setDraft]=useState<Valores|null>(null),[aba,setAba]=useState<Aba>('identificacao');
 const [target,setTarget]=useState<Linha|null>(null);
 const [history,setHistory]=useState<Linha[]>([]),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setErro('');try{
  const [p,c]=await Promise.all([recursoApi.listar(canManage?'/produtos/gestao':'/produtos'),recursoApi.listar('/categorias')]);setItems(p);setCategories(c);
 }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}},[canManage]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{setPage(1);},[busca,filtro,categoria,ordem,size]);
 useEffect(()=>{if(!lotesAtivos&&filtro==='validade')setFiltro('todos');},[lotesAtivos,filtro]);
 const filtered=useMemo(()=>items.filter(p=>{
  if(filtro==='ativos'&&!p.ativo||filtro==='inativos'&&p.ativo||filtro==='baixo'&&!baixo(p)||filtro==='validade'&&!vencendo(p))return false;
  if(categoria&&String(p.categoriaId)!==categoria)return false;
  return [p.nome,p.id,p.codigoBarras,p.marca,p.fabricante,p.grupo,p.subgrupo,p.ncm,p.cest].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR').trim()));
 }).sort((a,b)=>ordem==='estoque'?num(a.estoqueAtual)-num(b.estoqueAtual):ordem==='recentes'?String(b.criadoEm).localeCompare(String(a.criadoEm)):String(a.nome).localeCompare(String(b.nome),'pt-BR')),[items,busca,filtro,categoria,ordem]);
 const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.min(page,pages),rows=filtered.slice((current-1)*size,current*size);
 function open(p?:Linha){setSelected(p??null);setDraft(p?draftOf(p):inicial());setAba('identificacao');setErro('');setSuccess('');setHistory([]);setHistoryError('');}
 function close(){setDraft(null);setSelected(null);setErro('');setSuccess('');}
 const id=selected?.id;
 useEffect(()=>{if(aba!=='historico'||id==null)return;let alive=true;setHistoryLoading(true);setHistoryError('');
  recursoApi.listar('/movimentacoes-estoque').then(r=>{if(alive)setHistory(r.filter(m=>String(m.produtoId)===String(id)));}).catch(e=>{if(alive)setHistoryError(mensagemErro(e));}).finally(()=>{if(alive)setHistoryLoading(false);});return()=>{alive=false;};
 },[aba,id]);
 const editable=canManage&&(!selected||Boolean(selected.ativo));
 const change=(key:string,v:string|boolean)=>setDraft(d=>d?{...d,[key]:v}:d);
 async function save(e:React.FormEvent){e.preventDefault();if(!draft||!editable||busy)return;
  if(!String(draft.nome??'').trim()){setAba('identificacao');setErro('Informe o nome do produto.');return;}
  if(draft.precoVendaVarejo===''||draft.precoVendaVarejo==null){setAba('comercial');setErro('Informe o preço de varejo.');return;}
  for(const c of campos){if(c.type!=='number'||draft[c.key]===''||draft[c.key]==null)continue;const n=Number(draft[c.key]);if(!Number.isFinite(n)||n<0||(!c.step&&!Number.isInteger(n))){setErro('Verifique o valor de '+c.label+'.');return;}}
  for(const key of ['ncm','cest'] as const){const v=String(draft[key]??'').trim();if(v&&!(key==='ncm'?/^\d{8}$/:/^\d{7}$/).test(v)){setAba('identificacao');setErro(key.toUpperCase()+' deve conter '+limite(key)+' dígitos.');return;}}
  setBusy(true);setErro('');setSuccess('');
  try{
   const dados=montarDados(campos,draft,Boolean(selected));
   // Optional metadata can be cleared explicitly when editing.
   for(const key of Object.keys(metadados)){const value=String(draft[key]??'').trim();if(value)dados[key]=value;else if(selected)dados[key]=null;}
   if(!cascosAtivos)delete dados.retornavel;
   const saved=selected?await recursoApi.editar('/produtos',String(selected.id),dados):await recursoApi.criar('/produtos',dados);
   await load();setSelected({...selected,...saved});setDraft(draftOf({...selected,...saved}));setSuccess('Produto salvo com sucesso.');
  }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
 }
 async function toggle(){if(!target||busy)return;setBusy(true);setErro('');try{
  await api.patch('/produtos/'+encodeURIComponent(String(target.id))+'/situacao',{ativo:!target.ativo});
  setSuccess(target.ativo?'Produto desativado.':'Produto reativado.');
  if(selected?.id===target.id)setSelected({...selected,ativo:!target.ativo});
  setTarget(null);await load();
 }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}}
 const fields=(keys:string[])=>keys.map(key=>campos.find(c=>c.key===key)).filter((c):c is Campo=>Boolean(c)).filter(c=>c.key!=='retornavel'||cascosAtivos).map(c=><ProductField key={c.key} campo={c} draft={draft!} categories={categories} change={change} disabled={!editable||busy||Boolean(selected&&c.key==='estoqueAtual')}/>);
 const summary=[{n:'Total de produtos',v:items.length,Icon:Package,c:'mint'},{n:'Produtos ativos',v:items.filter(p=>p.ativo).length,Icon:ShoppingCart,c:'mint'},{n:'Estoque baixo',v:items.filter(baixo).length,Icon:AlertTriangle,c:'amber'},...(lotesAtivos?[{n:'Próx. do vencimento',v:items.filter(vencendo).length,Icon:CalendarClock,c:'red'}]:[])];
 return <div className="bp-page">
 <Notice message={erro} onClose={()=>setErro('')}/><Notice message={success} success onClose={()=>setSuccess('')}/>
 {draft?<form className="bp-ficha" onSubmit={save}>
  <button type="button" className="bp-back" onClick={close} disabled={busy}><ArrowLeft size={16}/> Produtos / Ficha do produto</button>
  <header className="bp-title"><span className="bp-title-icon"><Package size={25}/></span><div><h1>{selected?'Ficha do Produto':'Novo produto'}</h1><p>Cadastre e gerencie todas as informações do produto.</p></div></header>
  <section className="bp-panel bp-ident-header">
   <div className="bp-photo">{selected?.ativo?<ProdutoFoto key={String(selected.id)} produtoId={String(selected.id)} editable={editable}/>:<div className="bp-placeholder"><Package size={42}/><small>{selected?'Produto inativo':'Salve para adicionar foto'}</small></div>}</div>
   <div className="bp-ident-fields">
    <label className="bp-field"><span>Código interno</span><input readOnly value={selected?String(selected.id):'Gerado automaticamente'}/></label>
    {fields(['codigoBarras'])}
    <label className="bp-field"><span>Situação</span><div className="bp-status-field"><span className={selected&&!selected.ativo?'bp-inactive':'bp-active'}>● {selected&&!selected.ativo?'Inativo':'Ativo'}</span>{canManage&&selected&&<button type="button" onClick={()=>setTarget(selected)} disabled={busy}>{selected.ativo?'Desativar':'Reativar'}</button>}</div></label>
    {fields(['nome','categoriaId','unidadeMedida'])}
   </div>
  </section>
  <nav className="bp-tabs" aria-label="Seções da ficha">{([{key:'identificacao',label:'Identificação',Icon:Package},{key:'comercial',label:'Comercial',Icon:ShoppingCart},{key:'estoque',label:'Estoque',Icon:Grid2X2},{key:'historico',label:'Histórico',Icon:Clock}] as const).map(t=><button key={t.key} type="button" aria-pressed={aba===t.key} onClick={()=>setAba(t.key)}><t.Icon size={19}/>{t.label}</button>)}</nav>
  <div className="bp-ficha-body">
   <section className="bp-panel bp-detail">
    <h2>{aba==='identificacao'?'Informações gerais':aba==='comercial'?'Preços e condições comerciais':aba==='estoque'?'Estoque e lotes':'Histórico de movimentações'}</h2>
    {aba==='identificacao'&&<div className="bp-fields">{fields(['marca','fabricante','grupo','subgrupo','ml','fardoQuantidade','retornavel','descricaoComplementar'])}</div>}
    {aba==='identificacao'&&<><h2>Identificação fiscal</h2><div className="bp-fields">{fields(['ncm','cest'])}</div><p className="bp-note">Campos opcionais. Confira a classificação fiscal com a documentação do produto ou seu contador.</p></>}
    {aba==='comercial'&&<div className="bp-fields">{fields(['precoCusto','precoVendaVarejo','precoVendaAtacado','qtdAtacadoMinima'])}<label className="bp-field"><span>Acréscimo sobre custo (%)</span><input type="number" step=".01" min="-100" disabled={!editable||busy||num(draft.precoCusto)<=0} value={num(draft.precoCusto)>0?((num(draft.precoVendaVarejo)/num(draft.precoCusto)-1)*100).toFixed(2):''} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))change('precoVendaVarejo',String(Math.max(0,Math.round(num(draft.precoCusto)*(1+n/100)*100)/100)));}}/></label></div>}
    {aba==='estoque'&&<><div className="bp-fields">{fields(['estoqueAtual','estoqueMinimo'])}</div>{selected&&<p className="bp-note">Para alterar o saldo, use Movimentações de estoque.</p>}{lotesAtivos&&<div className="bp-lotes"><h3>Lotes cadastrados</h3><table><thead><tr><th>Lote</th><th>Validade</th><th>Quantidade</th></tr></thead><tbody>{(Array.isArray(selected?.lotes)?selected.lotes as Linha[]:[]).map(l=><tr key={String(l.id)}><td>{show(l.numeroLote)}</td><td>{dataBR(l.dataVencimento)}</td><td>{show(l.quantidade)} un.</td></tr>)}</tbody></table>{(!Array.isArray(selected?.lotes)||!selected.lotes.length)&&<p className="bp-note">Nenhum lote cadastrado.</p>}</div>}</>}
    {aba==='historico'&&<div className="bp-lotes"><Notice message={historyError}/>{historyLoading?<p className="bp-note">Carregando histórico...</p>:<><table><thead><tr><th>Data</th><th>Movimento</th><th>Qtd.</th><th>Motivo</th></tr></thead><tbody>{history.map(m=><tr key={String(m.id)}><td>{dataBR(m.criadoEm)}</td><td>{show(m.tipo).replaceAll('_',' ')}</td><td>{show(m.quantidade)}</td><td>{show(m.motivo)}</td></tr>)}</tbody></table>{!history.length&&!historyError&&<p className="bp-note">Nenhuma movimentação manual registrada.</p>}</>}</div>}
   </section>
   <section className="bp-panel bp-detail"><h2>Resumo do produto</h2><div className="bp-summary-grid">{[{n:'Custo',v:dinheiro(draft.precoCusto),c:'red'},{n:'Varejo',v:dinheiro(draft.precoVendaVarejo),c:'mint'},{n:'Atacado',v:draft.precoVendaAtacado===''?'—':dinheiro(draft.precoVendaAtacado),c:'blue'},{n:'Margem sobre venda',v:percent(margem(draft)),c:'amber'},{n:'Qtd. por fardo',v:show(draft.fardoQuantidade)+' un.',c:'blue'},{n:'Estoque disponível',v:show(draft.estoqueAtual)+' un.',c:'mint'},{n:'Estoque mínimo',v:show(draft.estoqueMinimo)+' un.',c:'amber'}].map(k=><div key={k.n} className="bp-mini"><span className={'bp-mini-icon '+k.c}><Package size={19}/></span><div><small>{k.n}</small><strong>{k.v}</strong></div></div>)}</div></section>
  </div>
  <footer className="bp-ficha-footer"><button type="button" className="bp-secondary" onClick={close} disabled={busy}><X size={17}/>{editable?'Cancelar':'Voltar'}</button>{editable&&<button type="submit" className="bp-primary" disabled={busy}><Save size={18}/>{busy?'Salvando...':'Salvar produto'}</button>}</footer>
 </form>:<>
  <header className="bp-title"><span className="bp-title-icon"><Package size={26}/></span><div><h1>Produtos</h1><p>Cadastre, gerencie seus produtos, preços, estoque e lotes.</p></div><button type="button" className="bp-secondary bp-refresh" disabled={loading} onClick={()=>void load()} aria-label="Atualizar produtos"><RefreshCcw size={17}/></button></header>
  <div className="bp-kpis">{summary.map(k=><div className="bp-panel bp-kpi" key={k.n}><span className={'bp-kpi-icon '+k.c}><k.Icon size={26}/></span><div><small>{k.n}</small><strong>{loading?'—':k.v.toLocaleString('pt-BR')}</strong></div></div>)}</div>
  <div className="bp-toolbar"><label className="bp-search"><Search size={19}/><input placeholder="Buscar nome, código, marca, grupo ou NCM..." aria-label="Buscar produtos" value={busca} onChange={e=>setBusca(e.target.value)}/></label><div className="bp-filters">{([{key:'todos',label:'Todos',Icon:Grid2X2},{key:'ativos',label:'Ativos',Icon:Check},...(canManage?[{key:'inativos',label:'Inativos',Icon:X} as const]:[]),{key:'baixo',label:'Estoque baixo',Icon:AlertTriangle},...(lotesAtivos?[{key:'validade',label:'Próx. vencimento',Icon:CalendarClock} as const]:[])] as const).map(f=><button key={f.key} type="button" className="bp-secondary" aria-pressed={filtro===f.key} onClick={()=>setFiltro(f.key)}><f.Icon size={15}/>{f.label}</button>)}</div>{canManage&&<button type="button" className="bp-primary" onClick={()=>open()}><Plus size={19}/> Novo produto</button>}</div>
  <div className="bp-selects"><label className="bp-field"><span>Categoria</span><select value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c=><option key={String(c.id)} value={String(c.id)}>{show(c.nome)}</option>)}</select></label><label className="bp-field"><span>Ordenar por</span><select value={ordem} onChange={e=>setOrdem(e.target.value)}><option value="nome">Nome (A – Z)</option><option value="recentes">Mais recentes</option><option value="estoque">Menor estoque</option></select></label></div>
  <section className="bp-panel bp-list"><div className="bp-table-wrap"><table><thead><tr>{['Produto','Cód. interno','Cód. barras','Categoria','Custo (R$)','Varejo (R$)','Atacado (R$)','Margem','Estoque','Est. mín.','Status','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(p=><tr key={String(p.id)}><td><button className="bp-product-link" onClick={()=>open(p)}>{p.ativo&&(!canManage||p.foto)?<ProdutoFoto produtoId={String(p.id)} editable={false}/>:<span className="bp-thumb"><Package size={22}/></span>}<span><strong>{show(p.nome)}</strong><small>{p.marca?show(p.marca)+' · ':''}{show(p.unidadeMedida)}{p.ml?' · '+show(p.ml)+' ml':''}</small></span></button></td><td>{show(p.id)}</td><td>{show(p.codigoBarras)}</td><td><span className="bp-category">{show(valor(p,'categoria.nome'))}</span></td><td>{dinheiro(p.precoCusto)}</td><td>{dinheiro(p.precoVendaVarejo)}</td><td>{p.precoVendaAtacado==null?'—':dinheiro(p.precoVendaAtacado)}</td><td><span className="bp-margin">{percent(margem(p))}</span></td><td>{show(p.estoqueAtual)}</td><td>{show(p.estoqueMinimo)}</td><td><span className={'bp-pill '+(!p.ativo?'inactive':baixo(p)?'warning':'active')}>● {!p.ativo?'Inativo':baixo(p)?'Estoque baixo':'Ativo'}</span></td><td><div className="bp-row-actions"><button type="button" onClick={()=>open(p)} aria-label={'Abrir '+show(p.nome)}>{canManage&&p.ativo?<Pencil size={16}/>:<Eye size={16}/>}</button>{canManage&&<button type="button" className={p.ativo?'danger':'reactivate'} onClick={()=>setTarget(p)} aria-label={(p.ativo?'Desativar ':'Reativar ')+show(p.nome)}>{p.ativo?<Trash2 size={16}/>:<Check size={16}/>}</button>}</div></td></tr>)}</tbody></table></div>{loading?<p className="bp-empty">Carregando produtos...</p>:!rows.length&&<p className="bp-empty">Nenhum produto encontrado.</p>}</section>
  <footer className="bp-pagination"><span>Exibindo {filtered.length?(current-1)*size+1:0} a {Math.min(current*size,filtered.length)} de {filtered.length} produtos</span><div><label>Itens por página <select value={size} onChange={e=>setSize(Number(e.target.value))}>{[8,16,24].map(n=><option key={n}>{n}</option>)}</select></label><button type="button" className="bp-secondary" disabled={current<=1} onClick={()=>setPage(current-1)} aria-label="Página anterior"><ChevronLeft size={17}/></button>{Array.from({length:Math.min(5,pages)},(_,i)=>Math.max(1,Math.min(current-2,pages-4))+i).map(n=><button type="button" key={n} aria-current={n===current?'page':undefined} className="bp-secondary" onClick={()=>setPage(n)}>{n}</button>)}<button type="button" className="bp-secondary" disabled={current>=pages} onClick={()=>setPage(current+1)} aria-label="Próxima página"><ChevronRight size={17}/></button></div></footer>
 </>}
 {target&&<Modal title={target.ativo?'Desativar produto':'Reativar produto'} onClose={()=>{if(!busy)setTarget(null);}}><p>{target.ativo?'O produto deixará de aparecer no PDV. O histórico será preservado.':'O produto voltará a ficar disponível para operação.'}</p><p className="my-4 font-bold">{show(target.nome)}</p><Notice message={erro}/><div className="flex justify-end gap-2"><button type="button" className="bp-secondary" disabled={busy} onClick={()=>setTarget(null)}>Cancelar</button><button type="button" className="bp-primary" disabled={busy} onClick={()=>void toggle()}>Confirmar</button></div></Modal>}
 </div>;
}
