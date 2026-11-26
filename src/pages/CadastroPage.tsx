import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, LockKeyhole, Pencil, Search, Trash2, Shield, Package, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { definicoes, montarDados, recursoApi, valor } from '../services/operacional';
import type { Campo, Linha, Recurso, Valores } from '../services/operacional';
import { btn, card, dataBR, dinheiro, Empty, input, mensagemErro, Modal, Notice, PageTitle, secondary } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const CHAVE_CATEGORIA=(r:Linha)=>String(r.nome??r.razaoSocial??r.id??'');
const PERMISSOES=[
  ['VENDAS_CANCELAR','Cancelar vendas'],['CAIXA_MOVIMENTAR','Fazer sangrias e suprimentos'],
  ['CAIXA_FECHAR','Fechar caixa'],['ESTOQUE_AJUSTAR','Ajustar estoque'],
  ['PRODUTOS_GERENCIAR','Cadastrar e editar produtos/categorias'],
  ['FORNECEDORES_GERENCIAR','Cadastrar e editar fornecedores'],
  ['LOTES_REMOVER','Remover lotes'],['FIADOS_LANCAR','Lançar fiados'],
  ['FIADOS_RECEBER','Receber fiados'],['VASILHAMES_MOVIMENTAR','Movimentar vasilhames'],
  ['DELIVERY_ACERTAR','Acertar entregas'],
] as const;

function FormatCell({row,keyName,format}:{row:Linha;keyName:string;format?:string}){
  const v=valor(row,keyName);
  if(format==='money')return <span className="font-semibold tabular-nums">{dinheiro(v)}</span>;
  if(format==='date')return <span>{dataBR(v)}</span>;
  if(format==='boolean')return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${v?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{v?'Ativo':'Inativo'}</span>;
  if(format==='stock')return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${Number(v)<=Number(row.estoqueMinimo??0)?'bg-amber-100 text-amber-800':'bg-emerald-50 text-emerald-700'}`}>{String(v??0)}</span>;
  return <span>{v===null||v===undefined||v===''?'—':String(v)}</span>;
}
function Field({campo,value,options,onChange,disabled}:{campo:Campo;value:string|number|boolean|null|undefined;options?:{value:string|number;label:string}[];onChange:(v:string|number|boolean)=>void;disabled?:boolean}){
  const id='cadastro-'+campo.key;
  return <div className={campo.span?'sm:col-span-2':''}>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{campo.label}{campo.required?' *':''}</label>
    {campo.type==='checkbox'?<label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><input id={id} type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)} disabled={disabled} className="h-4 w-4 accent-teal-700"/><span className="text-sm text-slate-500">{Boolean(value)?'Sim':'Não'}</span></label>
    :campo.type==='select'?<select id={id} className={input} value={String(value??'')} required={campo.required} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">Selecione...</option>{(options??campo.options??[]).map(o=><option key={String(o.value)} value={o.value}>{o.label}</option>)}</select>
    :campo.type==='textarea'?<textarea id={id} className={input} rows={3} value={String(value??'')} onChange={e=>onChange(e.target.value)} disabled={disabled}/>
    :<input id={id} type={campo.type||'text'} className={input} value={String(value??'')} required={campo.required} disabled={disabled} min={campo.type==='number'?0:undefined} step={campo.step??(campo.type==='number'?'1':undefined)} placeholder={campo.placeholder||''} onChange={e=>onChange(e.target.value)}/>
    }
  </div>;
}
const initial=(fields:Campo[]):Valores=>Object.fromEntries(fields.map(f=>[f.key, f.key==='ativo'?true:f.type==='checkbox'?false:''])) as Valores;

export function CadastroPage({resource}:{resource:Recurso}){
  const cfg=definicoes[resource];
  const {user}=useAuth();
  const isManager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
  const permissao=(chave:string)=>isManager||Boolean(user?.permissoes?.includes(chave));
  const canCreate=resource==='produtos'||resource==='categorias'?permissao('PRODUTOS_GERENCIAR')
    :resource==='fornecedores'?permissao('FORNECEDORES_GERENCIAR')
    :resource==='lotes'?permissao('ESTOQUE_AJUSTAR'):true;
  const canEdit=Boolean(cfg.canEdit && (resource==='produtos'||resource==='categorias'
    ?permissao('PRODUTOS_GERENCIAR'):resource==='fornecedores'
    ?permissao('FORNECEDORES_GERENCIAR'):true));
  const canDelete=Boolean(cfg.canDelete && (resource==='produtos'||resource==='categorias'
    ?permissao('PRODUTOS_GERENCIAR'):resource==='fornecedores'
    ?permissao('FORNECEDORES_GERENCIAR'):resource==='lotes'
    ?permissao('LOTES_REMOVER'):resource==='clientes'?isManager:true));
  const [items,setItems]=useState<Linha[]>([]);
  const [refData,setRefData]=useState<Partial<Record<Recurso,Linha[]>>>({});
  const [busca,setBusca]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [success,setSuccess]=useState('');
  const [editing,setEditing]=useState<Linha|null>(null);
  const [draft,setDraft]=useState<Valores|null>(null);
  const [detalhe,setDetalhe]=useState<Linha|null>(null);
  const [acesso,setAcesso]=useState<Linha|null>(null);
  const [permissoes,setPermissoes]=useState<string[]>([]);
  const [email,setEmail]=useState('');
  const [senha,setSenha]=useState('');
  const [codigo,setCodigo]=useState('');
  const [deleteTarget,setDeleteTarget]=useState<Linha|null>(null);

  const reload=useCallback(async()=>{
    setLoading(true);setErro('');
    try{
      const deps=[...new Set(cfg.fields.map(f=>f.resource).filter((x):x is Recurso=>!!x))];
      const [lista,...referencias]=await Promise.all([
        recursoApi.listar(cfg.endpoint),
        ...deps.map(d=>recursoApi.listar(definicoes[d].endpoint)),
      ]);
      setItems(lista);
      setRefData(Object.fromEntries(deps.map((d,i)=>[d,referencias[i]])));
    }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
  },[cfg]);
  useEffect(()=>{setItems([]);setBusca('');void reload();},[reload]);

  const filtered=useMemo(()=>items.filter(item=>Object.values(item).some(x=>
    ['string','number'].includes(typeof x)&&String(x).toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))
  )),[items,busca]);

  function openNew(){setEditing(null);setDraft(initial(cfg.fields));setErro('');setSuccess('');}
  function openEdit(item:Linha){setEditing(item);setDraft(Object.fromEntries(cfg.fields.map(f=>[
    f.key,f.type==='date'&&item[f.key]?String(item[f.key]).slice(0,10):typeof item[f.key]==='boolean'?item[f.key]:item[f.key]??''
  ])) as Valores);setErro('');}
  async function save(e:React.FormEvent){
    e.preventDefault();if(!draft||busy)return;
    setBusy(true);setErro('');setSuccess('');
    try{
      const dados=montarDados(cfg.fields,draft,!!editing);
      if(resource==='clientes'&&!isManager)delete dados.limiteCredito;
      if(editing){
        if(resource==='fornecedores'){
          delete dados.cnpj; // Immutability and optional fields not supported by certain legacy service updates.
        }
        await recursoApi.editar(cfg.endpoint,String(editing.id),dados);
      }else await recursoApi.criar(cfg.endpoint,dados);
      setDraft(null);setEditing(null);setSuccess(`${cfg.singular[0].toUpperCase()+cfg.singular.slice(1)} salvo com sucesso.`);
      await reload();
    }catch(err){setErro(mensagemErro(err));}finally{setBusy(false);}
  }
  async function remove(){
    if(!deleteTarget||busy)return;
    setBusy(true);setErro('');
    try{
      await recursoApi.excluir(cfg.endpoint,String(deleteTarget.id));
      setSuccess('Registro removido ou desativado.');setDeleteTarget(null);await reload();
    }catch(err){setErro(mensagemErro(err));setDeleteTarget(null);}finally{setBusy(false);}
  }
  async function view(item:Linha){
    setBusy(true);setErro('');
    try{setDetalhe(await recursoApi.detalhe(cfg.endpoint,String(item.id)));}
    catch(err){setErro(mensagemErro(err));}finally{setBusy(false);}
  }
  function openAcesso(item:Linha){
    setAcesso(item);
    const usuario=item.usuario as Linha|undefined;
    setPermissoes(Array.isArray(usuario?.permissoes)?usuario.permissoes.map(String):[]);
    setEmail(String(usuario?.email??''));setSenha('');setCodigo(String(item.codigo??''));
    setErro('');
  }
  async function saveAcesso(e:React.FormEvent){
    e.preventDefault();if(!acesso||busy)return;

    setBusy(true);setErro('');
    try{
      await api.post(`/funcionarios/${encodeURIComponent(String(acesso.id))}/acesso`,{
        email,codigo:codigo?Number(codigo):undefined,senha,permissoes,
      });
      setAcesso(null);setSuccess('Acesso configurado. O funcionário deverá trocar a senha no primeiro login.');
      await reload();
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }

  if(cfg.managerOnly&&!isManager)return <div className={`${card} p-10 text-center text-sm text-slate-600`}><Shield className="mx-auto mb-4 text-teal-700" size={35}/>Apenas gestores podem acessar esta área.</div>;
  return <>
    <PageTitle title={cfg.title} subtitle={cfg.description} action={canCreate?openNew:undefined} onReload={()=>void reload()} loading={loading}/>
    <Notice message={erro} onClose={()=>setErro('')}/><Notice message={success} success onClose={()=>setSuccess('')}/>
    <section className={`${card} bf-register-list overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="relative max-w-lg flex-1"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input aria-label="Pesquisar cadastros" className={`${input} pl-10`} placeholder="Buscar nos registros..." value={busca} onChange={e=>setBusca(e.target.value)}/></div>
        <span className="text-xs font-semibold text-slate-500">{filtered.length} registro(s)</span>
      </div>
      {loading?<div className="p-10 text-center text-sm text-slate-500">Carregando {cfg.title.toLowerCase()}...</div>:filtered.length===0?<div className="p-5"><Empty>Nenhum cadastro encontrado. Comece usando “Novo cadastro” acima.</Empty></div>:
      <><div className="space-y-3 p-3 sm:hidden">{filtered.map(row=><article key={String(row.id)} className="rounded-2xl border border-[#29374c] bg-[#101a2a] p-4">
        <div className="space-y-3">{cfg.columns.slice(0,6).map(c=><div key={c.key} className="flex items-start justify-between gap-3 text-sm"><span className="max-w-[42%] text-xs font-semibold text-slate-400">{c.label}</span><span className="max-w-[58%] break-words text-right font-bold text-slate-100"><FormatCell row={row} keyName={c.key} format={c.format}/></span></div>)}</div>
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#29374c] pt-3">
          <button type="button" onClick={()=>void view(row)} className={secondary} aria-label="Ver detalhes"><Eye size={17}/> Detalhes</button>
          {canEdit&&<button type="button" onClick={()=>openEdit(row)} className={secondary}><Pencil size={17}/> Editar</button>}
          {resource==='funcionarios'&&<button type="button" onClick={()=>openAcesso(row)} className={secondary}><KeyRound size={17}/> Acesso</button>}
          {canDelete&&<button type="button" onClick={()=>setDeleteTarget(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-3 text-sm text-rose-300"><Trash2 size={17}/> Remover</button>}
        </div>
      </article>)}</div>
      <div className="bf-table-scroll hidden overflow-x-auto sm:block"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f7faf8] text-xs uppercase tracking-wide text-slate-500"><tr>{cfg.columns.map(c=><th className="px-4 py-4" key={c.key}>{c.label}</th>)}<th className="px-4 py-4 text-right">Ações</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={String(row.id)} className="hover:bg-[#151f32]">{cfg.columns.map(c=><td key={c.key} className="max-w-[240px] truncate px-4 py-4"><FormatCell row={row} keyName={c.key} format={c.format}/></td>)}
      <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={()=>void view(row)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Ver detalhes" aria-label="Ver detalhes"><Eye size={17}/></button>
      {canEdit&&<button onClick={()=>openEdit(row)} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50" title="Editar" aria-label="Editar"><Pencil size={17}/></button>}
      {resource==='funcionarios'&&<button onClick={()=>openAcesso(row)} className="rounded-lg p-2 text-indigo-700 hover:bg-indigo-50" title="Senha, código e permissões" aria-label="Configurar acesso"><KeyRound size={17}/></button>}
      {canDelete&&<button onClick={()=>setDeleteTarget(row)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Remover" aria-label="Remover"><Trash2 size={17}/></button>}</div></td></tr>)}</tbody></table></div></>}
    </section>

    {draft&&<Modal wide title={editing?`Editar ${cfg.singular}`:`Cadastrar ${cfg.singular}`} onClose={()=>setDraft(null)}>
      <form onSubmit={e=>void save(e)} className="bf-record-form space-y-4">
      {resource==='produtos'?<div className="bf-product-edit-grid">
        {[
          {title:'Identificação e embalagem',keys:['nome','codigoBarras','categoriaId','unidadeMedida','ml','fardoQuantidade','retornavel']},
          {title:'Preços e condições comerciais',keys:['precoCusto','precoVendaVarejo','precoVendaAtacado','qtdAtacadoMinima']},
          {title:'Estoque',keys:['estoqueAtual','estoqueMinimo']},
        ].map(group=>{const fields=cfg.fields.filter(c=>group.keys.includes(c.key));return <fieldset key={group.title} className="bf-record-section"><legend>{group.title}</legend><div className="bf-field-grid">{fields.map(c=><Field key={c.key} campo={c} value={draft[c.key]} disabled={busy||Boolean(editing&&resource==='produtos'&&c.key==='estoqueAtual')||Boolean(resource==='clientes'&&!isManager&&c.key==='limiteCredito')} options={c.resource?(refData[c.resource]||[]).map(item=>({value:String(item.id),label:CHAVE_CATEGORIA(item)})):undefined} onChange={v=>setDraft(p=>({...p!,[c.key]:v}))}/>)}</div></fieldset>})}
      </div>:<div className="bf-field-grid">{cfg.fields.map(c=><Field key={c.key} campo={c} value={draft[c.key]} disabled={busy||Boolean(resource==='clientes'&&!isManager&&c.key==='limiteCredito')} options={c.resource?(refData[c.resource]||[]).map(item=>({value:String(item.id),label:CHAVE_CATEGORIA(item)})):undefined} onChange={v=>setDraft(p=>({...p!,[c.key]:v}))}/>)}</div>}
      {resource==='produtos'&&draft&&<div className="rounded-2xl border border-blue-500/20 bg-[#101a2a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-blue-300">Calculadora de preço</strong><span className="text-xs text-slate-400">Acréscimo sobre custo</span></div>
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_1fr]">
          <label className="text-xs font-semibold text-slate-300">Acréscimo desejado (%)
            <input className={`${input} mt-2`} type="number" step="0.01" min="-100" max="100000" disabled={busy||!(Number(draft.precoCusto)>0)}
              value={Number(draft.precoCusto)>0&&Number.isFinite(Number(draft.precoVendaVarejo))?(((Number(draft.precoVendaVarejo)||0)/Number(draft.precoCusto)-1)*100).toFixed(2):''}
              placeholder="Informe primeiro o custo"
              onChange={e=>{const percent=Number(e.target.value);const custo=Number(draft.precoCusto);if(Number.isFinite(percent)&&custo>0){setDraft(d=>d?{...d,precoVendaVarejo:Math.max(0,Math.round(custo*(1+percent/100)*100)/100)}:d);}}}/>
          </label>
          <p className="pb-2 text-xs leading-relaxed text-slate-400">Digite o custo e ajuste o percentual para calcular o preço automaticamente. Se preferir, informe o preço manualmente e o percentual será atualizado.</p>
        </div>
      </div>}
      <p className="text-xs text-slate-500">{resource==='produtos'&&editing?'Para modificar o estoque, utilize Movimentações de estoque. ':''}Os campos enviados seguem o contrato da API.</p>
      {erro&&<Notice message={erro}/>}
      <div className="bf-record-actions flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setDraft(null)} className={secondary}>Cancelar</button><button type="submit" disabled={busy} className={btn}>{busy?'Salvando...':'Salvar cadastro'}</button></div></form>
    </Modal>}
    {detalhe&&<Modal wide title={resource==='produtos'?'Ficha do produto':`Detalhes de ${cfg.singular}`} onClose={()=>setDetalhe(null)}>
      {resource==='produtos'?<>
        <div className="bf-product-heading"><span className="bf-product-icon"><Package size={30}/></span><div><p className="text-xs text-slate-400">Produto #{String(detalhe.id??'—')}</p><h3 className="text-xl font-bold">{String(detalhe.nome??'Produto')}</h3><span className="text-sm text-slate-400">Código de barras: {String(detalhe.codigoBarras??'—')}</span></div>{canEdit&&<button className={btn} onClick={()=>{const item=detalhe;setDetalhe(null);openEdit(item);}}><Pencil size={16}/> Editar ficha</button>}</div>
        <div className="bf-product-summary">{[['Estoque atual',String(detalhe.estoqueAtual??0)],['Estoque mínimo',String(detalhe.estoqueMinimo??0)],['Custo',dinheiro(detalhe.precoCusto)],['Varejo',dinheiro(detalhe.precoVendaVarejo)],['Atacado',detalhe.precoVendaAtacado==null?'—':dinheiro(detalhe.precoVendaAtacado)]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
        <section className="bf-record-section"><h3 className="bf-section-caption">Informações gerais</h3><div className="bf-field-grid">
          {cfg.fields.filter(c=>!['nome','codigoBarras','estoqueAtual','estoqueMinimo','precoCusto','precoVendaVarejo','precoVendaAtacado'].includes(c.key)).map(c=><div key={c.key} className="bf-read-field"><small>{c.label}</small><strong>{c.key==='categoriaId'?String(valor(detalhe,'categoria.nome')??'—'):c.type==='checkbox'?(detalhe[c.key]?'Sim':'Não'):String(detalhe[c.key]??'—')}</strong></div>)}
          <div className="bf-read-field"><small>Situação</small><FormatCell row={detalhe} keyName="ativo" format="boolean"/></div>
        </div></section>
        <section className="bf-record-section"><h3 className="bf-section-caption flex items-center gap-2"><Package size={16}/> Lotes cadastrados</h3>
          <div className="bf-table-scroll overflow-x-auto"><table className="w-full min-w-[430px] text-left text-sm"><thead><tr><th>Lote</th><th>Validade</th><th className="text-right">Quantidade</th></tr></thead><tbody>{Array.isArray(detalhe.lotes)&&(detalhe.lotes as Linha[]).map(l=><tr key={String(l.id)}><td>{String(l.numeroLote||l.id)}</td><td>{dataBR(l.dataVencimento)}</td><td className="text-right font-semibold">{String(l.quantidade??0)} un.</td></tr>)}</tbody></table>{(!Array.isArray(detalhe.lotes)||!detalhe.lotes.length)&&<p className="bf-empty-text">Sem lotes cadastrados para este produto.</p>}</div>
        </section>
      </>:<div className="bf-field-grid">{cfg.columns.map(c=><div key={c.key} className="bf-read-field"><small>{c.label}</small><div className="text-sm font-bold"><FormatCell row={detalhe} keyName={c.key} format={c.format}/></div></div>)}</div>}
      <div className="bf-record-actions mt-4 flex justify-end"><button className={secondary} onClick={()=>setDetalhe(null)}>Fechar ficha</button></div>
    </Modal>}
    {deleteTarget&&<Modal title="Confirmar remoção" onClose={()=>setDeleteTarget(null)}><p className="text-sm text-slate-600">Deseja realmente remover ou desativar este registro? Esta ação pode alterar o estoque ou impedir novas operações.</p><p className="my-4 rounded-xl bg-slate-50 p-4 font-bold">{String(deleteTarget.nome||deleteTarget.razaoSocial||deleteTarget.numeroLote||deleteTarget.id)}</p><div className="flex justify-end gap-2"><button className={secondary} onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className={`${btn} !bg-rose-600`} onClick={()=>void remove()} disabled={busy}>{busy?'Removendo...':'Confirmar'}</button></div></Modal>}
    {acesso&&<Modal wide title={`Acesso · ${String(acesso.nome)}`} onClose={()=>setAcesso(null)}><form onSubmit={e=>void saveAcesso(e)} className="space-y-4"><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">A nova senha é temporária. O funcionário deverá alterá-la no primeiro acesso. Reconfigurar um acesso revoga a sessão anterior.</p>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Código do operador<input type="number" min={1} className={`${input} mt-2`} value={codigo} onChange={e=>setCodigo(e.target.value)}/></label><label className="block text-sm font-semibold">E-mail de acesso<input type="email" required className={`${input} mt-2`} value={email} onChange={e=>setEmail(e.target.value)}/></label></div>
      <label className="block text-sm font-semibold">Nova senha inicial<input type="password" required autoComplete="new-password" className={`${input} mt-2`} value={senha} onChange={e=>setSenha(e.target.value)}/></label>
      <h3 className="flex items-center gap-2 pt-2 font-bold text-slate-800"><LockKeyhole size={18}/> Permissões específicas</h3><p className="text-xs text-slate-500">O servidor valida as permissões de cada operação. Gestores possuem alçadas definidas pelo cargo.</p>
      <div className="bf-table-scroll overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Permissão</th><th>Código</th><th className="text-center">Ativa</th></tr></thead><tbody>{PERMISSOES.map(([chave,nome])=><tr key={chave}><td>{nome}</td><td className="text-xs text-slate-400">{chave}</td><td className="text-center"><input aria-label={nome} type="checkbox" className="h-4 w-4 accent-teal-700" checked={permissoes.includes(chave)} onChange={e=>setPermissoes(p=>e.target.checked?[...p,chave]:p.filter(x=>x!==chave))}/></td></tr>)}</tbody></table></div><p className="text-xs text-slate-400">{permissoes.length} permissões específicas selecionadas.</p>
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondary} onClick={()=>setAcesso(null)}>Cancelar</button><button disabled={busy} type="submit" className={btn}>{busy?'Salvando...':'Salvar acesso'}</button></div>
    </form></Modal>}
  </>;
}
