import {useEffect,useRef,useState} from 'react';
import {Printer,RefreshCcw,Save} from 'lucide-react';
import {documentos,impressaoApi,imprimirDocumento,medidas,padrao,pendentes,validarPerfil} from '../services/impressao';
import type {Documento,Impressao,Perfil} from '../services/impressao';
import {mensagemErro,Notice} from '../components/ui';
import './impressao-config.css';

export function ImpressaoConfig({editavel,empresa,onDirty,onBusy,onSaved}:{editavel:boolean;empresa:string;onDirty:(v:boolean)=>void;onBusy:(v:boolean)=>void;onSaved:(revisao:string|null)=>void}){
 const [dados,setDados]=useState<Impressao|null>(null),[draft,setDraft]=useState<Impressao|null>(null),[tipo,setTipo]=useState<Documento>('venda'),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[ok,setOk]=useState('');
 const seq=useRef(0),lock=useRef(false),preview=useRef<HTMLDivElement>(null);
 const dirty=Boolean(dados&&draft&&JSON.stringify(dados)!==JSON.stringify(draft));
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 useEffect(()=>{onBusy(busy);return()=>onBusy(false);},[busy,onBusy]);
 async function load(){const n=++seq.current;setLoading(true);setErro('');try{const res=await impressaoApi.consultar();if(n===seq.current){setDados(res);setDraft(res);}}catch(e){if(n===seq.current)setErro(mensagemErro(e));}finally{if(n===seq.current)setLoading(false);}}
 useEffect(()=>{void load();return()=>{seq.current++;};},[]);
 const p=draft?.perfis[tipo],disabled=!editavel||busy||loading;
 function change(v:Partial<Perfil>){setDraft(d=>d?{...d,perfis:{...d.perfis,[tipo]:{...d.perfis[tipo],...v}}}:d);}
 function papel(v:Perfil['papel']){
  if(v==='PERSONALIZADO'){change({papel:v});return;}
  const map={'58':[58,null],'80':[80,null],A4:[210,297],A5:[148,210]} as const;
  const [largura,altura]=map[v];change({papel:v,largura,altura,orientacao:altura===null?'RETRATO':p?.orientacao??'RETRATO'});
 }
 async function save(){
  if(!draft||!dirty||disabled||lock.current)return;
  for(const [k,v] of Object.entries(draft.perfis)){const e=validarPerfil(v);if(e){setTipo(k as Documento);setErro(documentos[k as Documento]+': '+e);return;}}
  lock.current=true;setBusy(true);setErro('');setOk('');
  try{const res=await impressaoApi.salvar(draft);setDados(res);setDraft(res);setOk('Perfis de impressão salvos.');onSaved(res.revisao);}
  catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 if(loading)return <section className="cf-panel">Carregando perfis de impressão...</section>;
 if(!p||!draft)return <section className="cf-panel"><Notice message={erro}/><button type="button" className="cf-secondary" onClick={()=>void load()}><RefreshCcw size={16}/> Tentar novamente</button></section>;
 const e=validarPerfil(p),m=medidas(p);
 const number=(label:string,k:'largura'|'altura'|'superior'|'inferior'|'esquerda'|'direita'|'tamanho',min:number,max:number,step=1,extra=false)=><label>{label}<input type="number" min={min} max={max} step={step} value={p[k]??''} disabled={disabled||extra} onChange={ev=>change({[k]:ev.target.value===''?0:Number(ev.target.value)})}/></label>;
 return <div className="bp-print-config"><Notice message={erro} onClose={()=>setErro('')}/><Notice message={ok} success onClose={()=>setOk('')}/>
 <div className="bp-print-grid"><section className="cf-panel"><h2><Printer size={19}/> Formato de impressão</h2><p>Configure um perfil por documento. As preferências são compartilhadas pela distribuidora.</p>
 <label>Documento<select value={tipo} disabled={busy} onChange={ev=>setTipo(ev.target.value as Documento)}>{Object.entries(documentos).map(([k,n])=><option key={k} value={k}>{n}{pendentes.includes(k as Documento)?' (preparação)':''}</option>)}</select></label>
 {pendentes.includes(tipo)&&<p className="cf-note">Perfil disponível para configuração e teste. A ação de impressão deste documento ainda não está integrada à tela operacional.</p>}
 <div className="cf-grid"><label>Papel<select value={p.papel} disabled={disabled} onChange={ev=>papel(ev.target.value as Perfil['papel'])}><option value="58">Térmico 58 mm</option><option value="80">Térmico 80 mm</option><option value="A4">A4</option><option value="A5">A5</option><option value="PERSONALIZADO">Personalizado</option></select></label>
 <label>Orientação<select value={p.orientacao} disabled={disabled||p.altura===null} onChange={ev=>change({orientacao:ev.target.value as Perfil['orientacao']})}><option value="RETRATO">Retrato</option><option value="PAISAGEM">Paisagem</option></select></label>
 {number('Largura (mm)','largura',40,420,0.1,p.papel!=='PERSONALIZADO')}
 {p.altura===null?<label>Altura<input value="Contínua — driver" readOnly/></label>:number('Altura (mm)','altura',60,1000,0.1,p.papel!=='PERSONALIZADO')}
 </div>{p.papel==='PERSONALIZADO'&&<label className="bp-print-check"><input type="checkbox" checked={p.altura===null} disabled={disabled} onChange={ev=>change({altura:ev.target.checked?null:297,...(ev.target.checked?{orientacao:'RETRATO' as const}:{})})}/> Papel contínuo</label>}
 <h3>Margens (mm)</h3><div className="cf-grid">{number('Superior','superior',0,40,0.1)}{number('Inferior','inferior',0,40,0.1)}{number('Esquerda','esquerda',0,40,0.1)}{number('Direita','direita',0,40,0.1)}</div>
 <div className="cf-grid"><label>Fonte<select value={p.fonte} disabled={disabled} onChange={ev=>change({fonte:ev.target.value as Perfil['fonte']})}><option value="Arial">Arial</option><option value="monospace">Monoespaçada</option></select></label>{number('Tamanho (pt)','tamanho',8,18)}</div>
 {tipo==='venda'&&<><h3>Informações opcionais</h3>{([['endereco','Endereço e telefone da loja'],['operador','Operador'],['rodape','Mensagem de atendimento']] as const).map(([k,n])=><label key={k} className="bp-print-check"><input type="checkbox" checked={p[k]} disabled={disabled} onChange={ev=>change({[k]:ev.target.checked})}/>{n}</label>)}</>}
 {tipo==='financeiro'&&<label className="bp-print-check"><input type="checkbox" checked={p.operador} disabled={disabled} onChange={ev=>change({operador:ev.target.checked})}/> Exibir responsável</label>}
 <p className="cf-note">A impressora, o tamanho físico do rolo, a escala e a quantidade de vias são escolhidos na janela do navegador. A altura contínua depende do driver.</p>
 {e&&<p role="alert" className="bp-print-error">{e}</p>}
 <button type="button" className="cf-secondary" disabled={disabled} onClick={()=>change(padrao(tipo))}>Restaurar padrão deste documento</button></section>
 <section className="cf-panel"><h2>Pré-visualização</h2><p>{m.w} mm × {m.h===null?'contínuo':m.h+' mm'} · {p.tamanho} pt · margens {p.superior}/{p.direita}/{p.inferior}/{p.esquerda} mm</p>
 <div className="bp-print-preview"><div ref={preview} className="bp-print-paper" style={{width:'min(100%, '+Math.max(40,Math.min(1000,m.w))+'mm)',fontFamily:p.fonte==='monospace'?'monospace':'Arial, sans-serif',fontSize:Math.max(8,Math.min(18,p.tamanho))+'pt',padding:[p.superior,p.direita,p.inferior,p.esquerda].map(n=>Math.max(0,Math.min(40,n))+'mm').join(' ')}}>
 <header><h2>{empresa}</h2><p><b>{documentos[tipo]}</b></p>{tipo==='venda'&&p.endereco&&<p data-print-option="endereco">Endereço e telefone de exemplo</p>}</header><hr/><p>Documento de teste · Nº 000125</p>{(tipo==='venda'||tipo==='financeiro')&&p.operador&&<p data-print-option="operador">Operador: Exemplo</p>}
 <table><thead><tr><th>Descrição</th><th>Valor</th></tr></thead><tbody><tr><td>Produto exemplo × 2</td><td>R$ 20,00</td></tr><tr><td>Produto exemplo × 1</td><td>R$ 8,00</td></tr></tbody></table><hr/><p><b>Total: R$ 28,00</b></p>{tipo==='venda'&&p.rodape&&<p data-print-option="rodape">Obrigado pela preferência!</p>}<p>TESTE — SEM VALOR FISCAL</p></div></div>
 <button type="button" className="cf-secondary" disabled={busy||!!e} onClick={()=>{if(preview.current)void imprimirDocumento(tipo,preview.current,p);}}><Printer size={16}/> Testar impressão</button><small>A prévia contém dados fictícios e não representa uma venda real.</small></section></div>
 {editavel&&<footer className="cf-footer"><span>{dirty?'Alterações não salvas':'Perfis sincronizados'}</span><button type="button" className="cf-secondary" disabled={!dirty||busy} onClick={()=>{setDraft(dados);setErro('');}}>Descartar alterações</button><button type="button" className="cf-primary" disabled={!dirty||disabled||!!e} onClick={()=>void save()}><Save size={17}/> {busy?'Salvando...':'Salvar perfis'}</button></footer>}</div>;
}
