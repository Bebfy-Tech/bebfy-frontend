import {useCallback,useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertTriangle} from 'lucide-react';
import {Modal,secondary} from './ui';

// Protect in-app links and explicit actions, plus reload/close through beforeunload.
// Browser history navigation is not intercepted by the current BrowserRouter.
export function useUnsavedChanges(dirty:boolean,busy=false){
 const navigate=useNavigate();
 const [pending,setPending]=useState<(()=>void)|null>(null);
 const requestExit=useCallback((action:()=>void)=>{
  if(busy)return;
  if(dirty)setPending(()=>action);else action();
 },[dirty,busy]);
 useEffect(()=>{
  if(!dirty&&!busy)return;
  const unload=(ev:BeforeUnloadEvent)=>{ev.preventDefault();ev.returnValue='';};
  const click=(ev:MouseEvent)=>{
   if(ev.defaultPrevented||ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;
   const a=ev.target instanceof Element?ev.target.closest('a[href]') as HTMLAnchorElement|null:null;
   if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download'))return;
   const dest=new URL(a.href,window.location.href);
   if(dest.origin!==window.location.origin||dest.pathname===window.location.pathname)return;
   ev.preventDefault();ev.stopPropagation();
   requestExit(()=>navigate(dest.pathname+dest.search+dest.hash));
  };
  window.addEventListener('beforeunload',unload);
  document.addEventListener('click',click,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
 },[dirty,busy,requestExit,navigate]);
 const confirmation=pending?<Modal title="Alterações não salvas" onClose={()=>setPending(null)}>
  <div className="bf-unsaved-warning"><AlertTriangle size={24}/><p>Existem alterações que ainda não foram salvas. Deseja descartá-las e continuar?</p></div>
  <div className="bf-unsaved-actions"><button type="button" className={secondary} onClick={()=>setPending(null)}>Continuar editando</button><button type="button" className="bf-discard" onClick={()=>{setPending(null);pending();}}>Descartar alterações</button></div>
 </Modal>:null;
 return {requestExit,confirmation};
}
