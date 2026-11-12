import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { saasLoginPath, tenantPath } from '../services/tenantUrls';

type Mode = 'saas' | 'tenant';
type TenantProfile = {
  email?: string; funcionario?: {nome?: string; telefone?:string|null; codigo?:number|null; cargo?:string;
    empresa?: {nomeFantasia?:string} };
};
const input = 'mt-2 min-h-12 w-full rounded-xl border border-[#485759] bg-[#1a292b] px-4 py-3 text-sm text-white outline-none focus:border-emerald-300';

export function ProfileModal({ mode, open, onClose }: {mode:Mode;open:boolean;onClose:()=>void}) {
  const { user: saasUser, atualizarPerfil }=useSaasAuth();
  const { user: tenantUser, empresa, logout:tenantLogout }=useAuth();
  const navigate=useNavigate();
  const [nome,setNome]=useState('');
  const [email,setEmail]=useState('');
  const [telefone,setTelefone]=useState('');
  const [perfil,setPerfil]=useState<TenantProfile|null>(null);
  const [senhaAtual,setSenhaAtual]=useState('');
  const [novaSenha,setNovaSenha]=useState('');
  const [confirmar,setConfirmar]=useState('');
  const [mostrar,setMostrar]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!open)return;
    setError('');setMessage('');setSenhaAtual('');setNovaSenha('');setConfirmar('');
    if(mode==='saas') {
      setNome(saasUser?.nome||'');setEmail(saasUser?.email||'');setTelefone('');setPerfil(null);
      return;
    }
    let mounted=true;
    setLoading(true);
    void api.get<TenantProfile>('/auth/perfil').then(r=>{
      if(!mounted)return;
      setPerfil(r.data);setNome(r.data.funcionario?.nome||tenantUser?.nome||'');
      setEmail(r.data.email||'');setTelefone(r.data.funcionario?.telefone||'');
    }).catch(()=>{if(mounted)setError('Não foi possível carregar o perfil.');}).finally(()=>{if(mounted)setLoading(false);});
    return ()=>{mounted=false;};
  },[open,mode,saasUser?.nome,saasUser?.email,tenantUser?.nome]);

  const errorText = (err:unknown)=>{
    const parsed=err as {response?:{data?:{message?:string|string[];error?:{message?:string}}};message?:string};
    const text=parsed.response?.data?.message||parsed.response?.data?.error?.message||parsed.message;
    return Array.isArray(text)?text.join(' · '):text||'Não foi possível concluir a alteração.';
  };
  const salvarDados=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');setMessage('');
    try {
      if(mode==='saas')await atualizarPerfil({nome:nome.trim(),...(email.trim()?{email:email.trim()}:{} )});
      else await api.patch('/auth/perfil',{nome:nome.trim(),email:email.trim(),...(telefone.trim()?{telefone:telefone.replace(/\D/g,'')}:{} )});
      setMessage('Dados do perfil atualizados com sucesso.');
    }catch(err){setError(errorText(err));}
    finally{setBusy(false);}
  };
  const alterarSenha=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;
    if(novaSenha!==confirmar){setError('A confirmação da senha não corresponde.');return;}
    if(novaSenha===senhaAtual){setError('A nova senha precisa ser diferente da atual.');return;}

    setBusy(true);setError('');setMessage('');
    try {
      if(mode==='saas'){
        await atualizarPerfil({senhaAtual,novaSenha});
        onClose();navigate(saasLoginPath,{replace:true});
      }else{
        await api.post('/auth/alterar-senha',{senhaAtual,novaSenha,confirmarNovaSenha:confirmar});
        tenantLogout();onClose();navigate(tenantPath(),{replace:true});
      }
    }catch(err){setError(errorText(err));}finally{setBusy(false);}
  };
  if(!open)return null;
  const displayName=mode==='saas'?saasUser?.nome:tenantUser?.nome;
  const displayCode=mode==='saas'?saasUser?.codigo:tenantUser?.codigo;
  const role=mode==='saas'?saasUser?.cargo:tenantUser?.cargo;
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="bebfy-profile-title">
    <div className="max-h-[96dvh] w-full max-w-[700px] overflow-y-auto rounded-3xl border border-[#46565a] bg-[#20292d] p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,.48)] sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div><p className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-emerald-300"><UserRound size={16}/> MINHA CONTA</p><h2 id="bebfy-profile-title" className="mt-2 text-2xl font-extrabold">Meu perfil e configurações</h2><p className="mt-2 text-sm text-slate-400">Consulte seu acesso e atualize suas informações pessoais.</p></div>
        <button type="button" onClick={onClose} aria-label="Fechar perfil" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={21}/></button>
      </div>
      {loading&&<p role="status" className="mt-5 text-sm text-slate-300">Carregando perfil...</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
      {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-200">{message}</p>}
      <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm sm:grid-cols-2">
        <div><span className="text-xs text-slate-400">Usuário</span><strong className="mt-1 block">{displayName||'Não identificado'}</strong></div>
        <div><span className="text-xs text-slate-400">Código de acesso</span><strong className="mt-1 block">{displayCode??perfil?.funcionario?.codigo??'—'}</strong></div>
        <div><span className="text-xs text-slate-400">Perfil</span><strong className="mt-1 block">{role?.replaceAll('_',' ')||'—'}</strong></div>
        <div><span className="text-xs text-slate-400">Ambiente</span><strong className="mt-1 block">{mode==='saas'?'Administração central Bebfy':empresa?.nomeFantasia||perfil?.funcionario?.empresa?.nomeFantasia||'Distribuidora'}</strong></div>
      </div>
      <form onSubmit={e=>void salvarDados(e)} className="mt-6 space-y-4">
        <h3 className="border-b border-white/10 pb-3 text-base font-extrabold">Informações de contato</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">Nome completo<input required minLength={2} className={input} value={nome} onChange={e=>setNome(e.target.value)}/></label>
          <label className="text-xs font-bold text-slate-300">E-mail<input required type="email" className={input} value={email} onChange={e=>setEmail(e.target.value)}/></label>
          {mode==='tenant'&&<label className="text-xs font-bold text-slate-300">Telefone (DDD + número)<input inputMode="tel" maxLength={15} className={input} value={telefone} onChange={e=>setTelefone(e.target.value.replace(/[^\d ()-]/g,'').slice(0,15))}/></label>}
        </div>
        <button type="submit" disabled={busy||loading} className="rounded-xl bg-[#51dcae] px-5 py-3 text-sm font-extrabold text-[#0a3329] disabled:opacity-50">{busy?'Salvando...':'Salvar dados do perfil'}</button>
      </form>
      <form onSubmit={e=>void alterarSenha(e)} className="mt-8 space-y-4">
        <h3 className="flex items-center gap-2 border-b border-white/10 pb-3 text-base font-extrabold"><LockKeyhole size={18} className="text-emerald-200"/> Alterar senha</h3>
        <p className="text-xs leading-5 text-slate-400">A troca de senha exige a senha atual e encerrará esta sessão por segurança.</p>
        <label className="block text-xs font-bold text-slate-300">Senha atual<input type={mostrar?'text':'password'} required autoComplete="current-password" className={input} value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)}/></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">Nova senha<input type={mostrar?'text':'password'} required autoComplete="new-password" className={input} value={novaSenha} onChange={e=>setNovaSenha(e.target.value)}/></label>
          <label className="text-xs font-bold text-slate-300">Confirmar senha<input type={mostrar?'text':'password'} required autoComplete="new-password" className={input} value={confirmar} onChange={e=>setConfirmar(e.target.value)}/></label>
        </div>
        <button type="button" onClick={()=>setMostrar(!mostrar)} className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200">{mostrar?<EyeOff size={17}/>:<Eye size={17}/>} {mostrar?'Ocultar senhas':'Visualizar senhas'}</button>
        <div><button type="submit" disabled={busy} className="rounded-xl border border-emerald-300/35 px-5 py-3 text-sm font-bold text-emerald-200 hover:bg-white/5 disabled:opacity-50">Atualizar senha</button></div>
      </form>
      <p className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-400"><ShieldCheck size={16}/> Suas credenciais não são exibidas nem armazenadas nesta interface.</p>
    </div>
  </div>;
}
