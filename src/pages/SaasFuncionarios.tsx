import { useEffect, useState } from 'react';
import { saasAuthApi } from '../services/saasAuth';
import type { SaasFuncionario, SaasUser } from '../services/saasAuth';

const options=[
  ['EMPRESAS','Distribuidoras'],
  ['PLANOS','Planos e assinaturas'],
  ['MODULOS','Módulos'],
  ['FUNCIONARIOS','Gestão de funcionários'],
] as const;
const field='w-full rounded-lg border border-white/20 bg-[#101829] p-3 text-white';
export function SaasFuncionarios({current}:{current:SaasUser|null}) {
 const [users,setUsers]=useState<SaasFuncionario[]>([]);
 const [codigo,setCodigo]=useState('');
 const [nome,setNome]=useState('');
 const [senha,setSenha]=useState('');
 const [permissoes,setPermissoes]=useState<string[]>(['EMPRESAS']);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const canManage=current?.cargo==='SUPER_ADMIN'||current?.permissoes.includes('FUNCIONARIOS');
 const reload=async()=>setUsers(await saasAuthApi.funcionarios());
 useEffect(()=>{if(canManage) void reload().catch(()=>setError('Não foi possível carregar os colaboradores.'));},[canManage]);
 const create=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try {
   await saasAuthApi.criarFuncionario({codigo:Number(codigo),nome,senha,cargo:'OPERADOR',permissoes});
   setCodigo('');setNome('');setSenha('');await reload();setMessage('Funcionário cadastrado.');
  }catch(e){setError((e as {response?:{data?:{message?:string}}}).response?.data?.message||'Não foi possível cadastrar.');}
  finally{setBusy(false);}
 };
 const toggle=async(user:SaasFuncionario)=>{
  setBusy(true);setError('');
  try{await saasAuthApi.alterarFuncionario(user.id,{ativo:!user.ativo});await reload();}
  catch{setError('Não foi possível alterar o status.');}
  finally{setBusy(false);}
 };
 const togglePermission=async(user:SaasFuncionario,key:string)=>{
  setBusy(true);setError('');
  const permissions=user.permissoes.includes(key)?user.permissoes.filter(p=>p!==key):[...user.permissoes,key];
  try{await saasAuthApi.alterarFuncionario(user.id,{permissoes:permissions});await reload();}
  catch{setError('Não foi possível alterar as permissões.');}
  finally{setBusy(false);}
 };
 if(!canManage)return <p className="text-rose-200">Sua conta não possui permissão para cadastrar funcionários.</p>;
 return <div className="space-y-6">
   <div><h2 className="text-2xl font-extrabold">Funcionários do SaaS</h2><p className="text-sm text-slate-400">Cadastre colaboradores da administração central, sem vincular às distribuidoras.</p></div>
   {error&&<p role="alert" className="rounded-lg bg-rose-800/30 p-3 text-rose-200">{error}</p>}
   {message&&<p role="status" className="rounded-lg bg-emerald-800/20 p-3 text-emerald-200">{message}</p>}
   <form onSubmit={e=>void create(e)} className="rounded-2xl border border-[#1f2937] bg-[#0a0f1d] p-5 space-y-4">
    <h3 className="font-bold">Cadastrar funcionário</h3>
    <div className="grid gap-4 md:grid-cols-3">
     <label className="text-sm">Código de acesso<input className={field} type="number" min="3" required value={codigo} onChange={e=>setCodigo(e.target.value)}/></label>
     <label className="text-sm">Nome completo<input className={field} minLength={2} required value={nome} onChange={e=>setNome(e.target.value)}/></label>
     <label className="text-sm">Senha inicial (12+ caracteres)<input className={field} type="password" minLength={12} required value={senha} onChange={e=>setSenha(e.target.value)}/></label>
    </div>
    <div className="flex flex-wrap gap-4">{options.map(([key,title])=><label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={permissoes.includes(key)} onChange={e=>setPermissoes(p=>e.target.checked?[...p,key]:p.filter(x=>x!==key))}/>{title}</label>)}</div>
    <button disabled={busy} className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-[#052117] disabled:opacity-50">Cadastrar funcionário</button>
   </form>
   <section className="rounded-2xl border border-[#1f2937] bg-[#0a0f1d] p-5 space-y-4">
    <h3 className="font-bold">Equipe cadastrada</h3>
    {users.map(user=><div key={user.id} className="rounded-xl border border-[#1f2937] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
       <div><b>{user.nome}</b><p className="text-xs text-slate-400">Código {user.codigo} · {user.cargo==='SUPER_ADMIN'?'Administrador geral':'Funcionário'} · {user.ativo?'Ativo':'Bloqueado'}</p></div>
       {user.cargo!=='SUPER_ADMIN'&&<button disabled={busy} onClick={()=>void toggle(user)} className="rounded-lg border border-white/20 px-4 py-2 text-sm">{user.ativo?'Desativar':'Reativar'}</button>}
      </div>
      {user.cargo!=='SUPER_ADMIN'&&<div className="flex flex-wrap gap-4">{options.map(([key,title])=><label key={key} className="flex gap-2 text-xs"><input disabled={busy} type="checkbox" checked={user.permissoes.includes(key)} onChange={()=>void togglePermission(user,key)}/>{title}</label>)}</div>}
     </div>)}
    {!users.length&&<p className="text-sm text-slate-400">Nenhum funcionário cadastrado.</p>}
   </section>
  </div>;
}
