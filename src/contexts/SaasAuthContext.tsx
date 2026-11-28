import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {saasAuthApi,SAAS_TOKEN_KEY,SAAS_SESSION_EVENT} from '../services/saasAuth';
import type {SaasUser} from '../services/saasAuth';
type ProfileData={nome?:string;email?:string|null;senhaAtual?:string;novaSenha?:string};
type SaasContextValue={
 user:SaasUser|null;loading:boolean;notice:string;sessionUnavailable:boolean;
 login:(codigo:number,senha:string)=>Promise<void>;
 atualizarPerfil:(dados:ProfileData)=>Promise<void>;
 refreshSession:()=>Promise<void>;
 logout:()=>void;
};
const SaasContext=createContext<SaasContextValue|null>(null);
export function SaasAuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<SaasUser|null>(null),[loading,setLoading]=useState(true);
 const [notice,setNotice]=useState(''),[sessionUnavailable,setSessionUnavailable]=useState(false);
 const generation=useRef(0);
 const clear=useCallback((reason='')=>{
  generation.current++;localStorage.removeItem(SAAS_TOKEN_KEY);setUser(null);setLoading(false);setSessionUnavailable(false);setNotice(reason);
 },[]);
 const refreshSession=useCallback(async()=>{
  const token=localStorage.getItem(SAAS_TOKEN_KEY);
  if(!token){setUser(null);setLoading(false);return;}
  const seq=generation.current;
  try{
   const profile=await saasAuthApi.perfil();
   if(seq===generation.current&&token===localStorage.getItem(SAAS_TOKEN_KEY)){setUser(previous=>JSON.stringify(previous)===JSON.stringify(profile)?previous:profile);setSessionUnavailable(false);}
  }catch(e){
   if(seq===generation.current&&token===localStorage.getItem(SAAS_TOKEN_KEY)){
    const status=(e as {response?:{status?:number}}).response?.status;
    if(status===401)clear('Sessão expirada ou revogada. Entre novamente.');
    else setSessionUnavailable(true);
   }
  }finally{if(seq===generation.current)setLoading(false);}
 },[clear]);
 useEffect(()=>{
  const invalid=(event:Event)=>clear((event as CustomEvent<string>).detail||'Sessão encerrada. Entre novamente.');
  const storage=(event:StorageEvent)=>{
   if(event.key!==SAAS_TOKEN_KEY&&event.key!==null)return;
   generation.current++;setUser(null);setNotice('');setSessionUnavailable(false);
   if(localStorage.getItem(SAAS_TOKEN_KEY)){setLoading(true);void refreshSession();}else setLoading(false);
  };
  window.addEventListener(SAAS_SESSION_EVENT,invalid);window.addEventListener('storage',storage);
  const focus=()=>{if(!document.hidden&&/^\/saas(?:\/|$)/i.test(window.location.pathname))void refreshSession();};
  const timer=window.setInterval(focus,30000);
  window.addEventListener('focus',focus);
  document.addEventListener('visibilitychange',focus);
  void refreshSession();
  return()=>{window.clearInterval(timer);window.removeEventListener(SAAS_SESSION_EVENT,invalid);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[clear,refreshSession]);
 const login=async(codigo:number,senha:string)=>{
  const seq=++generation.current;const data=await saasAuthApi.login(codigo,senha);
  if(seq!==generation.current)return;
  localStorage.setItem(SAAS_TOKEN_KEY,data.access_token);setUser(data.usuario);setNotice('');setSessionUnavailable(false);setLoading(false);
 };
 const atualizarPerfil=async(dados:ProfileData)=>{
  const seq=generation.current;const updated=await saasAuthApi.atualizarPerfil(dados);
  if(seq!==generation.current)return;
  if(dados.novaSenha)clear('Senha alterada. Entre novamente com a nova senha.');
  else setUser(updated);
 };
 const logout=()=>{
  void saasAuthApi.logout().catch(()=>{});
  clear();
 };
 return <SaasContext.Provider value={{user,loading,notice,sessionUnavailable,login,atualizarPerfil,refreshSession,logout}}>{children}</SaasContext.Provider>;
}
export function useSaasAuth(){const context=useContext(SaasContext);if(!context)throw new Error('SaasAuthProvider ausente');return context;}
