import {useState} from 'react';
import type {EmpresaSaas} from '../services/saas';
export function SaasTeste({empresa,busy,onSave}:{empresa:EmpresaSaas;busy:boolean;onSave:(dias:number,motivo:string)=>unknown}){
 const [dias,setDias]=useState(14),[motivo,setMotivo]=useState('');
 const expira=empresa.testeAte?Date.parse(empresa.testeAte):null;
 const restante=expira===null?null:Math.max(0,Math.ceil((expira-Date.now())/86400000));
 return <div className="mt-5 space-y-3 border-t border-slate-700 pt-4">
 <h4 className="font-bold">Período de teste</h4>
 <p className="text-sm">{expira===null?'Prazo não definido':expira<=Date.now()?'Teste vencido':'Teste vigente'}{empresa.testeAte&&' · '+new Date(empresa.testeAte).toLocaleString('pt-BR')}</p>
 {restante!==null&&<p className="text-sm text-slate-400">{restante} dia(s) restante(s)</p>}
 <label className="block text-sm">Dias adicionais<input className="block w-full rounded-lg border border-slate-600 bg-[#24272e] p-2" type="number" min={1} max={90} value={dias} onChange={e=>setDias(Number(e.target.value))}/></label>
 <label className="block text-sm">Justificativa<textarea className="block w-full rounded-lg border border-slate-600 bg-[#24272e] p-2" value={motivo} maxLength={500} onChange={e=>setMotivo(e.target.value)}/></label>
 <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40" disabled={busy||!Number.isInteger(dias)||dias<1||dias>90||motivo.trim().length<8} onClick={()=>{if(window.confirm('Confirmar prorrogação do teste?'))void onSave(dias,motivo.trim());}}>Prorrogar teste</button>
 </div>;
}
