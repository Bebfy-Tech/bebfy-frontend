import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { saasAuthApi } from '../services/saasAuth';
import type { SaasUser } from '../services/saasAuth';

type SaasContextValue = {
 user: SaasUser|null;
 loading: boolean;
 login: (codigo:number,senha:string)=>Promise<void>;
 logout: ()=>void;
};
const SaasContext=createContext<SaasContextValue|null>(null);
export function SaasAuthProvider({children}:{children:ReactNode}) {
 const [user,setUser]=useState<SaasUser|null>(null);
 const [loading,setLoading]=useState(true);
 const clear=()=>{
   localStorage.removeItem('@Bebfy:saasToken');
   setUser(null);
 };
 useEffect(()=>{
   if (!localStorage.getItem('@Bebfy:saasToken')) {setLoading(false);return;}
   void saasAuthApi.perfil().then(setUser).catch(clear).finally(()=>setLoading(false));
 },[]);
 const login=async(codigo:number,senha:string)=>{
   const data=await saasAuthApi.login(codigo,senha);
   localStorage.setItem('@Bebfy:saasToken',data.access_token);
   setUser(data.usuario);
 };
 const logout=()=>{
   void saasAuthApi.logout().catch(()=>{});
   clear();
 };
 return <SaasContext.Provider value={{user,loading,login,logout}}>{children}</SaasContext.Provider>;
}
export function useSaasAuth() {
 const context=useContext(SaasContext);
 if(!context) throw new Error('SaasAuthProvider ausente');
 return context;
}
