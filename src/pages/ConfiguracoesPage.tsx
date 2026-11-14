import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { tenantPath } from '../services/tenantUrls';
import { useAuth } from '../contexts/AuthContext';
import { btn, card, input, mensagemErro, Notice, PageTitle } from '../components/ui';

export function ConfiguracoesPage(){
  const {user,empresa,logout}=useAuth();
  const navigate=useNavigate();
  const [senhaAtual,setSenhaAtual]=useState('');
  const [novaSenha,setNovaSenha]=useState('');
  const [confirmar,setConfirmar]=useState('');
  const [busy,setBusy]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  async function salvar(e:React.FormEvent){
    e.preventDefault();if(busy)return;
    if(novaSenha.length<10){setErro('A nova senha deve ter no mínimo 10 caracteres.');return;}
    if(novaSenha!==confirmar){setErro('A confirmação não corresponde à senha nova.');return;}
    if(novaSenha===senhaAtual){setErro('Escolha uma senha diferente da atual.');return;}
    setBusy(true);setErro('');setSucesso('');
    try{
      await api.post('/auth/alterar-senha',{senhaAtual,novaSenha,confirmarNovaSenha:confirmar});
      setSenhaAtual('');setNovaSenha('');setConfirmar('');
      setSucesso('Senha alterada. Faça login com a nova senha.');
      logout();navigate(tenantPath(),{replace:true});
    }catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}
  }
  return <>
    <PageTitle title="Minha conta e segurança" subtitle="Dados do operador e alteração segura da senha de acesso."/>
    <Notice message={erro}/><Notice message={sucesso} success/>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className={`${card} p-6`}><h2 className="flex items-center gap-2 text-lg font-extrabold"><UserRound size={22} className="text-teal-700"/> Meu perfil</h2><div className="mt-6 space-y-4">{[['Nome',user?.nome],['Código de acesso',user?.codigo],['Cargo',user?.cargo],['Empresa',empresa?.nomeFantasia],['Subdomínio',empresa?.subdominio]].map(([k,v])=><div key={String(k)} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">{k}</span><strong className="text-slate-800">{String(v||'—')}</strong></div>)}</div><div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-teal-900"><div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck size={18}/> Seu acesso é individual</div><p className="text-xs leading-relaxed">O Bebfy aceita somente uma sessão ativa por usuário. Se alguém confirmar um novo acesso com sua senha, sua sessão atual será desconectada.</p></div></section>
      <section className={`${card} p-6`}><h2 className="flex items-center gap-2 text-lg font-extrabold"><LockKeyhole size={22} className="text-teal-700"/> Alterar minha senha</h2><p className="mt-2 text-sm text-slate-500">Após alterar a senha, será necessário autenticar novamente.</p><form onSubmit={e=>void salvar(e)} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Senha atual<input className={`${input} mt-2`} required autoComplete="current-password" type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)}/></label><label className="block text-sm font-semibold">Nova senha<input className={`${input} mt-2`} required minLength={10} autoComplete="new-password" type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Mínimo de 10 caracteres"/></label><label className="block text-sm font-semibold">Confirmar nova senha<input className={`${input} mt-2`} required minLength={10} autoComplete="new-password" type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)}/></label><button className={`${btn} w-full`} type="submit" disabled={busy}><KeyRound size={18}/>{busy?'Atualizando...':'Salvar nova senha'}</button></form></section>
    </div><div className={`${card} mt-5 flex items-center gap-4 p-5`}><Building2 className="text-teal-700" size={24}/><div><strong className="text-sm">Identidade da distribuidora</strong><p className="mt-1 text-xs text-slate-500">Configurações comerciais e emissão fiscal oficial não estão disponíveis nesta etapa. O painel SaaS é administrado separadamente.</p></div></div>
  </>;
}
