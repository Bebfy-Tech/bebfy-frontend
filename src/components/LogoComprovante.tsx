import {useEffect,useState} from 'react';
import {api} from '../services/api';
import {compress} from './ProdutoFoto';
import {mensagemErro} from './ui';
type Logo={base64:string|null;exibir:boolean};
const vazio:Logo={base64:null,exibir:false};
const endpoint='/configuracoes/logo-comprovante';
export function LogoComprovante({base64}:{base64?:string|null}){
 if(!base64||base64.length>87384||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))return null;
 return <img src={'data:image/jpeg;base64,'+base64} alt="Logotipo da distribuidora" style={{display:'block',margin:'0 auto 3mm',maxWidth:'100%',width:'32mm',maxHeight:'22mm',objectFit:'contain'}}/>;
}
export function LogoComprovanteConfig({editavel,onLogo}:{editavel:boolean;onLogo:(base64:string|null)=>void}){
 const [dados,setDados]=useState<Logo>(vazio),[busy,setBusy]=useState(true),[erro,setErro]=useState(''),[ok,setOk]=useState(''),[rev,setRev]=useState(0),[ready,setReady]=useState(false);
 useEffect(()=>{let ativo=true;setBusy(true);setReady(false);setErro('');void api.get<Logo>(endpoint).then(r=>{if(ativo){setDados(r.data);onLogo(r.data.exibir?r.data.base64:null);setReady(true);}}).catch(e=>{if(ativo)setErro(mensagemErro(e));}).finally(()=>{if(ativo)setBusy(false);});return()=>{ativo=false;};},[onLogo,rev]);
 const salvar=async(next:Logo)=>{const r=await api.put<Logo>(endpoint,next);setDados(r.data);onLogo(r.data.exibir?r.data.base64:null);setOk('Logotipo atualizado.');};
 const executar=async(fn:()=>Promise<void>)=>{if(!editavel||busy||!ready)return;setBusy(true);setErro('');setOk('');try{await fn();}catch(e){setErro(mensagemErro(e));}finally{setBusy(false);}};
 return <div className="space-y-3 rounded-lg border border-slate-600 p-3"><h3>Logotipo do comprovante</h3><p className="text-xs">JPG, PNG ou WebP de até 8 MB. A imagem será compactada para impressão.</p>{dados.base64&&<div className="rounded bg-white p-3"><LogoComprovante base64={dados.base64}/></div>}
 {erro&&<p role="alert">{erro}</p>}{ok&&<p role="status">{ok}</p>}{!ready&&!busy&&<button type="button" className="cf-secondary" onClick={()=>setRev(n=>n+1)}>Tentar novamente</button>}
 {editavel&&<><label>{dados.base64?'Substituir logotipo':'Adicionar logotipo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!ready} onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void executar(async()=>salvar({base64:await compress(f),exibir:true}));}}/></label>
 <label className="bp-print-check"><input type="checkbox" checked={dados.exibir} disabled={busy||!ready||!dados.base64} onChange={e=>{const exibir=e.target.checked;void executar(()=>salvar({...dados,exibir}));}}/> Exibir no comprovante de venda</label>
 {dados.base64&&<button type="button" className="cf-secondary" disabled={busy||!ready} onClick={()=>{if(window.confirm('Remover o logotipo da distribuidora?'))void executar(()=>salvar(vazio));}}>Remover logotipo</button>}</>}
 {busy&&<small role="status">Processando…</small>}<small>Alterações do logotipo são salvas imediatamente.</small></div>;
}
