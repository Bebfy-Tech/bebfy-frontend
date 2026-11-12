import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Pencil, Plus, Shield, Users, X } from 'lucide-react';
import { saasAuthApi } from '../services/saasAuth';
import type { SaasFuncionario, SaasUser } from '../services/saasAuth';

const options = [
  ['EMPRESAS', 'Distribuidoras'],
  ['PLANOS', 'Planos e assinaturas'],
  ['MODULOS', 'Módulos'],
  ['FUNCIONARIOS', 'Gestão de funcionários'],
] as const;
const field = 'saas-field mt-2 min-h-12 w-full rounded-xl border border-[#425658] bg-[#172327] px-4 py-3 text-white outline-none focus:border-emerald-300';
const btn = 'rounded-xl bg-[#53dcae] px-5 py-3 text-sm font-bold text-[#11382e] hover:bg-[#7ceac1] disabled:opacity-50';

export function SaasFuncionarios({ current }: { current: SaasUser | null }) {
  const [users, setUsers] = useState<SaasFuncionario[]>([]);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [permissoes, setPermissoes] = useState<string[]>(['EMPRESAS']);
  const [selected, setSelected] = useState<SaasFuncionario | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const canManage = current?.cargo === 'SUPER_ADMIN' || current?.permissoes.includes('FUNCIONARIOS');

  const reload = async () => {
    const data = await saasAuthApi.funcionarios();
    setUsers(data);
    const ids = new Set(data.map(u => u.codigo));
    let suggested = 3;
    while (ids.has(suggested)) suggested++;
    setCodigo(String(suggested));
  };

  useEffect(() => {
    if (!canManage) return;
    let mounted = true;
    setLoading(true);
    void saasAuthApi.funcionarios().then(data => {
      if (!mounted) return;
      setUsers(data);
      const ids = new Set(data.map(u => u.codigo));
      let suggested = 3;
      while (ids.has(suggested)) suggested++;
      setCodigo(String(suggested));
    }).catch(() => { if (mounted) setError('Não foi possível carregar a equipe.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [canManage]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await saasAuthApi.criarFuncionario({
        codigo: Number(codigo), nome: nome.trim(), senha, cargo: 'OPERADOR', permissoes,
      });
      setNome(''); setSenha(''); setPermissoes(['EMPRESAS']);
      await reload(); setMessage('Funcionário cadastrado com sucesso.');
    } catch (err) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || 'Não foi possível cadastrar o funcionário.');
    } finally { setBusy(false); }
  };

  const openEditor = (u: SaasFuncionario) => {
    setSelected(u); setEditCode(String(u.codigo)); setEditName(u.nome);
    setEditPassword(''); setEditPermissions([...u.permissoes]); setEditActive(u.ativo);
    setError(''); setMessage(''); setShowEditPassword(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || selected.cargo === 'SUPER_ADMIN' || busy) return;
    setBusy(true); setError('');
    try {
      await saasAuthApi.alterarFuncionario(selected.id, {
        codigo: Number(editCode), nome: editName.trim(), permissoes: editPermissions,
        ativo: editActive, ...(editPassword ? { senha: editPassword } : {}),
      });
      setSelected(null); await reload(); setMessage('Cadastro atualizado com sucesso.');
    } catch (err) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || 'Não foi possível salvar as alterações.');
    } finally { setBusy(false); }
  };

  const permissionList = (items: string[], setter: (values:string[]) => void) => <div className="grid gap-3 sm:grid-cols-2">
    {options.map(([key,title])=><label key={key} className="flex min-h-10 cursor-pointer items-center gap-2 text-xs text-slate-200">
      <input type="checkbox" checked={items.includes(key)} onChange={e=>setter(e.target.checked ? [...items,key] : items.filter(x=>x!==key))}/>
      {title}
    </label>)}
  </div>;
  if (!canManage) return <p role="alert" className="text-rose-200">Sua conta não tem permissão para gerenciar funcionários.</p>;

  return <div className="saas-staff space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-2xl font-extrabold">Equipe administrativa</h2><p className="mt-1 text-sm text-slate-400">Gerencie os acessos internos da plataforma sem alterar funcionários das distribuidoras.</p></div>
      <span className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-300">{users.length} colaboradores</span>
    </div>
    {error && !selected && <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"><Check size={17}/>{message}</p>}
    <form onSubmit={e=>void create(e)} className="saas-card space-y-5 rounded-2xl p-6">
      <div className="flex items-center gap-2"><Plus size={20} className="text-emerald-300"/><h3 className="text-lg font-extrabold">Cadastrar funcionário</h3></div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">Código de acesso
          <input className={field} type="number" min="3" required value={codigo} onChange={e=>setCodigo(e.target.value)}/>
        </label>
        <label className="text-sm font-semibold">Nome completo
          <input className={field} minLength={2} required value={nome} onChange={e=>setNome(e.target.value)}/>
        </label>
        <label className="text-sm font-semibold">Senha inicial
          <span className="relative block"><input className={field + ' pr-12'} required type={mostrarSenha?'text':'password'} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/>
          <button type="button" onClick={()=>setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha?'Ocultar senha':'Mostrar senha'} className="absolute right-3 top-4 rounded-lg p-2 text-slate-300 hover:bg-white/10">{mostrarSenha?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Permissões de acesso</h4><button type="button" onClick={()=>setPermissoes(permissoes.length===options.length?[]:options.map(([key])=>key))} className="text-xs font-bold text-emerald-300 hover:underline">{permissoes.length===options.length?'Desmarcar todas':'Marcar todas as permissões'}</button></div>
      {permissionList(permissoes,setPermissoes)}

      <button type="submit" disabled={busy} className={btn}>{busy?'Salvando...':'Cadastrar funcionário'}</button>
    </form>

    <section className="saas-card space-y-4 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-extrabold">Equipe cadastrada</h3><Users size={20} className="text-emerald-300"/></div>
      {loading && <p className="text-sm text-slate-400">Carregando colaboradores...</p>}
      {!loading && users.map(u=><button type="button" key={u.id} onClick={()=>u.cargo!=='SUPER_ADMIN'&&openEditor(u)} disabled={u.cargo==='SUPER_ADMIN'}
        className="flex w-full flex-col gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-emerald-400/35 hover:bg-white/[.04] disabled:cursor-default sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><strong>{u.nome}</strong><span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (u.ativo?'bg-emerald-400/10 text-emerald-200':'bg-slate-400/15 text-slate-300')}>{u.ativo?'Ativo':'Desativado'}</span></div>
          <p className="mt-1 text-xs text-slate-400">Código {u.codigo} · {u.cargo==='SUPER_ADMIN'?'Administrador geral':'Operador SaaS'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{u.permissoes.map(p=><span key={p} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">{options.find(([key])=>key===p)?.[1]||p}</span>)}</div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-emerald-300">{u.cargo==='SUPER_ADMIN'?<><Shield size={16}/> Protegido</>:<><Pencil size={16}/> Editar funcionário</>}</span>
      </button>)}
      {!loading && !users.length && <p className="py-8 text-center text-sm text-slate-400">Nenhum funcionário cadastrado.</p>}
    </section>

    {selected && <div role="dialog" aria-modal="true" aria-labelledby="saas-staff-modal-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={e=>void save(e)} className="max-h-[95dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl border border-white/15 bg-[#202b2e] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-emerald-300">EQUIPE SAAS</p><h2 id="saas-staff-modal-title" className="mt-1 text-2xl font-extrabold">Editar funcionário</h2></div><button type="button" onClick={()=>setSelected(null)} aria-label="Fechar" className="rounded-lg p-2 hover:bg-white/10"><X size={20}/></button></div>
        {error && <p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Nome completo<input className={field} minLength={2} required value={editName} onChange={e=>setEditName(e.target.value)}/></label>
          <label className="text-sm font-semibold">Código de acesso<input className={field} type="number" min="3" required value={editCode} onChange={e=>setEditCode(e.target.value)}/></label>
        </div>
        <label className="block text-sm font-semibold">Nova senha (opcional)
          <span className="relative block"><input className={field+' pr-12'} type={showEditPassword?'text':'password'} autoComplete="new-password" value={editPassword} onChange={e=>setEditPassword(e.target.value)} placeholder="Mantenha em branco para não alterar"/>
            <button type="button" onClick={()=>setShowEditPassword(!showEditPassword)} aria-label={showEditPassword?'Ocultar senha':'Mostrar senha'} className="absolute right-3 top-4 p-2 text-slate-300">{showEditPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
          </span>
        </label>
        <div className="flex justify-between gap-3"><h3 className="text-sm font-bold">Permissões</h3><button type="button" onClick={()=>setEditPermissions(editPermissions.length===options.length?[]:options.map(([key])=>key))} className="text-xs font-bold text-emerald-300">{editPermissions.length===options.length?'Desmarcar todas':'Marcar todas'}</button></div>
        {permissionList(editPermissions,setEditPermissions)}
        <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm"><input type="checkbox" checked={editActive} onChange={e=>setEditActive(e.target.checked)}/> Acesso ativo</label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={()=>setSelected(null)} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold">Cancelar</button><button type="submit" disabled={busy} className={btn}>{busy?'Salvando...':'Salvar alterações'}</button></div>
      </form>
    </div>}
  </div>;
}
