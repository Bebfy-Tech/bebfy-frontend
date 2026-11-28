import {useEffect,useState,useCallback,type ReactNode} from 'react';
import {api,TERMOS_EVENT} from '../services/api';
import {useAuth} from '../contexts/AuthContext';
type Termo={id:number;titulo:string;conteudo:string;publicadoEm:string};
type Estado={termo:Termo|null;pendente:boolean};
export function TermosGate({children}:{children:ReactNode}){
 const {user,empresa,token,logout}=useAuth();
 const [estado,setEstado]=useState<Estado|null>(null),[erro,setErro]=useState(false),[confirmado,setConfirmado]=useState(false),[busy,setBusy]=useState(false);
 const consultar=useCallback(async(bloquear=false)=>{if(bloquear)setEstado(null);try{const r=await api.get<Estado>('/auth/termos');if(localStorage.getItem('@Bebfy:token')===token){setEstado(anterior=>{if(anterior?.termo?.id!==r.data.termo?.id)setConfirmado(false);return r.data;});setErro(false);}}catch{if(localStorage.getItem('@Bebfy:token')===token)setErro(true);}},[token]);
 useEffect(()=>{setEstado(null);setConfirmado(false);void consultar(true);const timer=window.setInterval(()=>void consultar(),15000);const evento=()=>void consultar(true);window.addEventListener(TERMOS_EVENT,evento);return()=>{window.clearInterval(timer);window.removeEventListener(TERMOS_EVENT,evento);};},[consultar,user?.id,empresa?.id]);
 const aceitar=async()=>{if(!estado?.termo||!confirmado)return;setBusy(true);setErro(false);try{await api.post('/auth/termos/aceite',{versao:estado.termo.id,aceito:true});await consultar(true);}catch{setConfirmado(false);await consultar(true);setErro(true);}finally{setBusy(false);}};
 if(estado&&!estado.pendente&&!erro)return <>{children}</>;
 return <main className="grid min-h-screen place-items-center bg-[#0d0e11] p-5 text-white"><section className="w-full max-w-3xl space-y-5 rounded-2xl border border-slate-700 bg-[#171a21] p-6">
 <p className="text-xs font-bold tracking-widest text-emerald-300">BEBFY · TERMOS DE UTILIZAÇÃO</p>
 {erro&&<p role="alert" className="text-amber-300">Não foi possível verificar ou registrar o aceite. Tente novamente.</p>}
 {estado?.pendente&&estado.termo?<><h1 className="text-2xl font-bold">{estado.termo.titulo}</h1><p className="text-sm text-slate-400">Versão {estado.termo.id} · {new Date(estado.termo.publicadoEm).toLocaleString('pt-BR')}</p><div tabIndex={0} className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 p-4 text-sm leading-7">{estado.termo.conteudo}</div><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/>Li e aceito esta versão dos termos de utilização.</label><button disabled={!confirmado||busy} onClick={()=>void aceitar()} className="rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Aceitar e continuar</button></>:!erro?<p role="status">Verificando os termos vigentes…</p>:null}
 {erro&&<button onClick={()=>void consultar(true)} className="rounded-lg border border-slate-600 px-4 py-2">Tentar novamente</button>}<button onClick={logout} className="ml-3 rounded-lg border border-slate-600 px-4 py-2">Sair</button></section></main>;
}
