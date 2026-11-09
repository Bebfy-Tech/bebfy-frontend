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
    if(senha.length<10){setErro('A senha inicial precisa de pelo menos 10 caracteres.');return;}
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
    <PageTitle title={cfg.title} subtitle={cfg.description} action={openNew} onReload={()=>void reload()} loading={loading}/>
    <Notice message={erro} onClose={()=>setErro('')}/><Notice message={success} success onClose={()=>setSuccess('')}/>
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="relative max-w-lg flex-1"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input aria-label="Pesquisar cadastros" className={`${input} pl-10`} placeholder="Buscar nos registros..." value={busca} onChange={e=>setBusca(e.target.value)}/></div>
        <span className="text-xs font-semibold text-slate-500">{filtered.length} registro(s)</span>
      </div>
      {loading?<div className="p-10 text-center text-sm text-slate-500">Carregando {cfg.title.toLowerCase()}...</div>:filtered.length===0?<div className="p-5"><Empty>Nenhum cadastro encontrado. Use “Novo cadastro” para começar.</Empty></div>:
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f7faf8] text-xs uppercase tracking-wide text-slate-500"><tr>{cfg.columns.map(c=><th className="px-4 py-4" key={c.key}>{c.label}</th>)}<th className="px-4 py-4 text-right">Ações</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={String(row.id)} className="hover:bg-slate-50">{cfg.columns.map(c=><td key={c.key} className="max-w-[240px] truncate px-4 py-4"><FormatCell row={row} keyName={c.key} format={c.format}/></td>)}
      <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={()=>void view(row)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Ver detalhes" aria-label="Ver detalhes"><Eye size={17}/></button>
      {cfg.canEdit&&<button onClick={()=>openEdit(row)} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50" title="Editar" aria-label="Editar"><Pencil size={17}/></button>}
      {resource==='funcionarios'&&<button onClick={()=>openAcesso(row)} className="rounded-lg p-2 text-indigo-700 hover:bg-indigo-50" title="Senha, código e permissões" aria-label="Configurar acesso"><KeyRound size={17}/></button>}
      {cfg.canDelete&&<button onClick={()=>setDeleteTarget(row)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Remover" aria-label="Remover"><Trash2 size={17}/></button>}</div></td></tr>)}</tbody></table></div>}
    </section>

    {draft&&<Modal title={editing?`Editar ${cfg.singular}`:`Cadastrar ${cfg.singular}`} onClose={()=>setDraft(null)}>
      <form onSubmit={e=>void save(e)} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{cfg.fields.map(c=><Field key={c.key} campo={c} value={draft[c.key]} disabled={busy||Boolean(editing&&resource==='produtos'&&c.key==='estoqueAtual')} options={c.resource?(refData[c.resource]||[]).map(item=>({value:String(item.id),label:CHAVE_CATEGORIA(item)})):undefined} onChange={v=>setDraft(p=>({...p!,[c.key]:v}))}/>)}</div>
      <p className="text-xs text-slate-500">{resource==='produtos'&&editing?'Para modificar o estoque, utilize Movimentações de estoque. ':''}Os campos enviados seguem o contrato da API.</p>
      {erro&&<Notice message={erro}/>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={()=>setDraft(null)} className={secondary}>Cancelar</button><button type="submit" disabled={busy} className={btn}>{busy?'Salvando...':'Salvar cadastro'}</button></div></form>
    </Modal>}
    {detalhe&&<Modal title={`Detalhes de ${cfg.singular}`} onClose={()=>setDetalhe(null)}>
      <div className="grid gap-3 sm:grid-cols-2">{cfg.columns.map(c=><div key={c.key} className="rounded-xl bg-slate-50 p-4"><p className="mb-1 text-xs font-semibold text-slate-500">{c.label}</p><div className="text-sm font-bold"><FormatCell row={detalhe} keyName={c.key} format={c.format}/></div></div>)}</div>
      {resource==='produtos'&&<div className="mt-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><Package size={18}/> Lotes cadastrados</h3>{Array.isArray(detalhe.lotes)&&detalhe.lotes.length?<div className="space-y-2">{(detalhe.lotes as Linha[]).map(l=><div key={String(l.id)} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>Lote {String(l.numeroLote||l.id)} · {dataBR(l.dataVencimento)}</span><strong>{String(l.quantidade)} un.</strong></div>)}</div>:<Empty>Sem lotes cadastrados para este produto.</Empty>}</div>}
      <div className="mt-6 flex justify-end"><button className={secondary} onClick={()=>setDetalhe(null)}>Fechar</button></div>
    </Modal>}
    {deleteTarget&&<Modal title="Confirmar remoção" onClose={()=>setDeleteTarget(null)}><p className="text-sm text-slate-600">Deseja realmente remover ou desativar este registro? Esta ação pode alterar o estoque ou impedir novas operações.</p><p className="my-4 rounded-xl bg-slate-50 p-4 font-bold">{String(deleteTarget.nome||deleteTarget.razaoSocial||deleteTarget.numeroLote||deleteTarget.id)}</p><div className="flex justify-end gap-2"><button className={secondary} onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className={`${btn} !bg-rose-600`} onClick={()=>void remove()} disabled={busy}>{busy?'Removendo...':'Confirmar'}</button></div></Modal>}
    {acesso&&<Modal title={`Acesso · ${String(acesso.nome)}`} onClose={()=>setAcesso(null)}><form onSubmit={e=>void saveAcesso(e)} className="space-y-4"><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">A nova senha é temporária. O funcionário deverá alterá-la no primeiro acesso. Reconfigurar um acesso revoga a sessão anterior.</p>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Código do operador<input type="number" min={1} className={`${input} mt-2`} value={codigo} onChange={e=>setCodigo(e.target.value)}/></label><label className="block text-sm font-semibold">E-mail de acesso<input type="email" required className={`${input} mt-2`} value={email} onChange={e=>setEmail(e.target.value)}/></label></div>
      <label className="block text-sm font-semibold">Nova senha inicial (mínimo 10 caracteres)<input type="password" required minLength={10} autoComplete="new-password" className={`${input} mt-2`} value={senha} onChange={e=>setSenha(e.target.value)}/></label>
      <h3 className="flex items-center gap-2 pt-2 font-bold text-slate-800"><LockKeyhole size={18}/> Permissões específicas</h3><p className="text-xs text-slate-500">O servidor valida as permissões de cada operação. Gestores possuem alçadas definidas pelo cargo.</p>
      <div className="grid gap-2 sm:grid-cols-2">{PERMISSOES.map(([chave,nome])=><label key={chave} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" className="accent-teal-700" checked={permissoes.includes(chave)} onChange={e=>setPermissoes(p=>e.target.checked?[...p,chave]:p.filter(x=>x!==chave))}/>{nome}</label>)}</div>
      {erro&&<Notice message={erro}/>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondary} onClick={()=>setAcesso(null)}>Cancelar</button><button disabled={busy} type="submit" className={btn}>{busy?'Salvando...':'Salvar acesso'}</button></div>
    </form></Modal>}
  </>;
}
