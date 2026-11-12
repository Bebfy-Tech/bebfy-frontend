import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { BebfyBrand } from '../components/BebfyBrand';
import { api } from '../services/api';
import { tenantFromPath, tenantPath } from '../services/tenantUrls';

export function RecuperarSenha() {
  const [params]=useSearchParams();
  const token=params.get('token')||'';
  const [codigo,setCodigo]=useState('');
  const [senha,setSenha]=useState('');
  const [confirmacao,setConfirmacao]=useState('');
  const [mostrar,setMostrar]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [concluido,setConcluido]=useState(false);
  const getError=(err:unknown)=>{
    const e=err as {response?:{data?:{message?:string;error?:{message?:string}}};message?:string};
    return e.response?.data?.message||e.response?.data?.error?.message||e.message||'Não foi possível continuar.';
  };
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(busy)return;
    setError('');setMessage('');setBusy(true);
    try {
      if(token) {
        if(senha!==confirmacao) {setError('As senhas não conferem.');return;}
        if(senha.length<10) {setError('A senha deve conter pelo menos 10 caracteres.');return;}
        await api.post('/auth/recuperar-senha/confirmar',{token,novaSenha:senha,confirmarNovaSenha:confirmacao});
        setConcluido(true);setMessage('Senha alterada. Você já pode entrar com a nova senha.');
      }else{
        const login=codigo.replace(/\D/g,'');
        if(!/^\d{1,11}$/.test(login)){setError('Informe o código ou CPF numérico.');return;}
        const r=await api.post<{mensagem:string}>('/auth/recuperar-senha/solicitar',{login});
        setMessage(r.data.mensagem);
        setConcluido(true);
      }
    }catch(err){setError(getError(err));}
    finally{setBusy(false);}
  }
  return <main className="grid min-h-screen place-items-center bg-[#1a2023] px-4 py-12 text-white">
    <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#242d30] p-7 shadow-2xl sm:p-10">
      <Link to="/" aria-label="Bebfy, início" className="inline-flex"><BebfyBrand light compact/></Link>
      <div className="mt-8 grid h-12 w-12 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">{token?<KeyRound size={24}/>:<Mail size={24}/>}</div>
      <p className="mt-5 text-xs font-extrabold uppercase tracking-[.15em] text-emerald-300">{tenantFromPath()} · Recuperação de acesso</p>
      <h1 className="mt-2 text-[29px] font-extrabold tracking-tight">{token?'Definir nova senha':'Esqueceu sua senha?'}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{token?'Informe e confirme a nova senha. O link de recuperação é pessoal, temporário e pode ser usado uma única vez.':'Informe seu código de funcionário ou CPF. Se o acesso existir, um link temporário será enviado ao e-mail cadastrado do proprietário da distribuidora.'}</p>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-100">{message}</p>}
      {!concluido&&<form className="mt-7 space-y-5" onSubmit={e=>void submit(e)}>
        {!token?<label className="block text-sm font-semibold">Código do funcionário ou CPF
          <input required autoFocus inputMode="numeric" className="mt-2 min-h-14 w-full rounded-xl border border-white/20 bg-[#182529] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300" placeholder="Ex.: 1" value={codigo} onChange={e=>setCodigo(e.target.value)}/>
        </label>:<>
          <label className="block text-sm font-semibold">Nova senha<input required minLength={10} autoComplete="new-password" type={mostrar?'text':'password'} className="mt-2 min-h-14 w-full rounded-xl border border-white/20 bg-[#182529] px-4 text-sm text-white outline-none focus:border-emerald-300" value={senha} onChange={e=>setSenha(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Confirme a nova senha<input required minLength={10} autoComplete="new-password" type={mostrar?'text':'password'} className="mt-2 min-h-14 w-full rounded-xl border border-white/20 bg-[#182529] px-4 text-sm text-white outline-none focus:border-emerald-300" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)}/></label>
          <button type="button" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200" onClick={()=>setMostrar(!mostrar)}>{mostrar?<EyeOff size={17}/>:<Eye size={17}/>} {mostrar?'Ocultar senhas':'Mostrar senhas'}</button>
        </>}
        <button type="submit" disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#54daad] px-4 text-sm font-extrabold text-[#0b3229] disabled:opacity-50">{busy?'Processando...':token?'Salvar nova senha':'Enviar link de recuperação'} <ArrowRight size={18}/></button>
      </form>}
      <Link to={tenantPath()} className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-emerald-200 hover:text-white"><ArrowLeft size={16}/> Voltar ao login</Link>
      <p className="mt-6 flex items-start gap-2 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck size={17} className="shrink-0"/> Nunca compartilhe links de redefinição de senha. Se o e-mail não chegar, solicite auxílio ao administrador.</p>
    </div>
  </main>;
}
