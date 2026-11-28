import {useEffect,useState} from 'react';
import {Eye,EyeOff,LockKeyhole,ShieldCheck,UserRound,LogOut,X} from 'lucide-react';
import {useSaasAuth} from '../contexts/SaasAuthContext';
const labels:Record<string,string>={EMPRESAS:'Distribuidoras, financeiro e monitoramento',PLANOS:'Planos e assinaturas',MODULOS:'Módulos',FUNCIONARIOS:'Operadores e auditoria',SUPORTE:'Central de suporte'};
const field='sap-field w-full';
const errorText=(e:unknown)=>{const m=(e as {response?:{status?:number;data?:{message?:string|string[]}}}).response;if(m?.status===429)return 'Limite de tentativas atingido. Aguarde um minuto.';const msg=m?.data?.message;return Array.isArray(msg)?msg.join(' · '):msg||'Não foi possível salvar. Verifique sua conexão.';};
export function SaasProfile({open,onClose}:{open:boolean;onClose:()=>void}){
 const {user,atualizarPerfil,logout}=useSaasAuth();
 const [tab,setTab]=useState<'dados'|'seguranca'|'acessos'>('dados');
 const [nome,setNome]=useState(''),[email,setEmail]=useState(''),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{if(open){setTab('dados');setNome(user?.nome??'');setEmail(user?.email??'');setCurrent('');setNext('');setConfirm('');setShow(false);setError('');setMessage('');}},[open,user?.id]);
 const close=()=>{if(!busy){setCurrent('');setNext('');setConfirm('');setShow(false);onClose();}};
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;setError('');setMessage('');
  if(nome.trim().length<2){setError('Informe seu nome.');return;}
  setBusy(true);
  try{await atualizarPerfil({nome:nome.trim(),email:email.trim()||null});setMessage('Dados atualizados.');}catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 const changePassword=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;setError('');setMessage('');
  if(!current||next.length<12||new TextEncoder().encode(next).length>72||!next.trim()||next!==confirm||next===current){setError('Informe a senha atual e uma senha diferente de pelo menos 12 caracteres (até 72 bytes), com confirmação igual.');return;}
  if(!window.confirm('Alterar a senha e encerrar esta sessão?'))return;
  setBusy(true);
  try{await atualizarPerfil({senhaAtual:current,novaSenha:next});setCurrent('');setNext('');setConfirm('');onClose();}catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 if(!open||!user)return null;
 return <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-label="Meu perfil e configurações"><section className="sc-panel sap-dialog">
  <div className="sd-panel-head"><div><h3>Meu perfil e configurações</h3><p className="sd-muted">Administração central Bebfy</p></div><button className="sd-secondary" onClick={close} disabled={busy} aria-label="Fechar"><X size={18}/></button></div>
  <div className="sap-identity"><span><UserRound size={25}/></span><div><strong>{user.nome}</strong><p className="sd-muted">Código {user.codigo} · {user.cargo==='SUPER_ADMIN'?'Administrador geral':'Operador SaaS'}</p></div><span className="text-emerald-300 text-xs">Acesso habilitado</span></div>
  <nav className="sc-tabs" aria-label="Configurações">{(['dados','seguranca','acessos'] as const).map(t=><button key={t} type="button" disabled={busy} aria-pressed={tab===t} onClick={()=>{setTab(t);setError('');setMessage('');setShow(false);setCurrent('');setNext('');setConfirm('');}}>{t==='dados'?'Dados pessoais':t==='seguranca'?'Segurança':'Meus acessos'}</button>)}</nav>
  {error&&<p role="alert" className="sd-warning">{error}</p>}{message&&<p role="status" className="text-emerald-300 text-sm">{message}</p>}
  {tab==='dados'&&<form className="sap-form" onSubmit={e=>void save(e)}><label>Nome completo<input className={field} required maxLength={120} value={nome} onChange={e=>setNome(e.target.value)}/></label><label>E-mail (opcional)<input className={field} type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><p className="sd-muted">O código de acesso não pode ser alterado pelo próprio perfil. O e-mail é apenas informação de contato, não um mecanismo de recuperação automática.</p><button className="sd-primary" disabled={busy} type="submit">Salvar dados</button></form>}
  {tab==='seguranca'&&<form className="sap-form" onSubmit={e=>void changePassword(e)}><label>Senha atual<input className={field} required type={show?'text':'password'} autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)}/></label><label>Nova senha<input className={field} required type={show?'text':'password'} autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)}/></label><label>Confirmar senha<input className={field} required type={show?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="sd-secondary" type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={16}/>:<Eye size={16}/>} {show?'Ocultar':'Mostrar'} senhas</button><p className="sd-muted">Mínimo de 12 caracteres, máximo de 72 bytes. A troca revoga a sessão atual e exige novo login.</p><button className="sd-primary" disabled={busy} type="submit"><LockKeyhole size={16}/> Alterar senha</button></form>}
  {tab==='acessos'&&<div className="sap-access"><h4>Permissões da conta</h4>{user.cargo==='SUPER_ADMIN'?<p className="text-emerald-300">Acesso integral de administrador geral</p>:user.permissoes.length?user.permissoes.map(p=><p key={p}><ShieldCheck size={15}/> {labels[p]||p}</p>):<p className="sd-muted">Nenhuma permissão operacional atribuída.</p>}<p className="sd-muted">Uma sessão válida por operador, com duração máxima de 8 horas. Entrar em outro dispositivo invalida a sessão anterior.</p><button className="sd-secondary" onClick={()=>{if(window.confirm('Encerrar sua sessão administrativa?'))logout();}}><LogOut size={16}/> Encerrar sessão</button></div>}
  <p className="sd-muted">Não é possível recuperar ou visualizar a senha armazenada.</p>
 </section></div>;
}
