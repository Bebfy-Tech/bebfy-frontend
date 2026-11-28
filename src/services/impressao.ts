import {api} from './api';
import {mensagemErro} from '../components/ui';
export const documentos={venda:'Comprovante de venda não fiscal',fiado:'Comprovante de fiado',extrato:'Extrato de fiados',financeiro:'Comprovante financeiro',vasilhames:'Extrato de vasilhames',entrega:'Pedido de entrega',relatorio:'Relatórios gerenciais',dre:'DRE gerencial',caixa:'Fechamento de caixa',compra:'Pedido de compra',inventario:'Inventário'} as const;
export type Documento=keyof typeof documentos;
export type Perfil={papel:'58'|'80'|'A4'|'A5'|'PERSONALIZADO';largura:number;altura:number|null;orientacao:'RETRATO'|'PAISAGEM';superior:number;inferior:number;esquerda:number;direita:number;fonte:'Arial'|'monospace';tamanho:number;endereco:boolean;operador:boolean;rodape:boolean};
export type Impressao={perfis:Record<Documento,Perfil>;revisao:string|null};
export const pendentes:Documento[]=['caixa','compra','inventario'];
export const impressaoApi={consultar:()=>api.get<Impressao>('/configuracoes/impressao').then(r=>r.data),salvar:(body:Impressao)=>api.patch<Impressao>('/configuracoes/impressao',body).then(r=>r.data)};
export function padrao(d:Documento):Perfil{
 const t=['venda','fiado','entrega','caixa'].includes(d);
 return {papel:t?'80':'A4',largura:t?80:210,altura:t?null:297,orientacao:d==='relatorio'?'PAISAGEM':'RETRATO',superior:t?3:10,inferior:t?3:10,esquerda:t?3:10,direita:t?3:10,fonte:t?'monospace':'Arial',tamanho:t?10:11,endereco:true,operador:true,rodape:true};
}
export function medidas(p:Perfil){return p.orientacao==='PAISAGEM'&&p.altura!==null?{w:p.altura,h:p.largura}:{w:p.largura,h:p.altura};}
export function validarPerfil(p:Perfil){
 const range=(n:number,min:number,max:number)=>Number.isFinite(n)&&n>=min&&n<=max;
 if(!range(p.largura,40,420)||p.altura!==null&&!range(p.altura,60,1000)||!Number.isInteger(p.tamanho)||!range(p.tamanho,8,18)||![p.superior,p.inferior,p.esquerda,p.direita].every(n=>range(n,0,40)))return 'Confira dimensões, margens e tamanho da fonte.';
 const fix:Record<string,[number,number|null]>={'58':[58,null],'80':[80,null],A4:[210,297],A5:[148,210]};
 if(fix[p.papel]&&(p.largura!==fix[p.papel][0]||p.altura!==fix[p.papel][1]))return 'Dimensões incompatíveis com o papel.';
 if(p.altura===null&&p.orientacao==='PAISAGEM')return 'Papel contínuo requer orientação retrato.';
 const {w,h}=medidas(p);
 return w-p.esquerda-p.direita<25||h!==null&&h-p.superior-p.inferior<30?'Margens deixam área de impressão insuficiente.':'';
}
let active=false;
// Isolate the selected document from the application and its legacy print styles.
// No printer APIs or silent printing: the browser opens its native print dialog.
export async function imprimirDocumento(tipo:Documento,source:string|HTMLElement,override?:Perfil){
 if(active)return;
 active=true;let frame:HTMLIFrameElement|undefined;let timer:number|undefined;
 const cleanup=()=>{if(timer!==undefined)window.clearTimeout(timer);frame?.remove();active=false;};
 try{
  const root=typeof source==='string'?document.querySelector<HTMLElement>(source):source;
  if(!root)throw new Error('Documento indisponível. Abra novamente antes de imprimir.');
  const clone=root.cloneNode(true) as HTMLElement;
  const p=override??(await impressaoApi.consultar()).perfis[tipo];
  if(!p)throw new Error('Perfil de impressão indisponível.');
  const err=validarPerfil(p);if(err)throw new Error(err);
  clone.querySelectorAll('button,input,select,textarea,script,iframe,object,embed,[data-print-ignore]').forEach(n=>n.remove());
  for(const k of ['endereco','operador','rodape'] as const)if(!p[k])clone.querySelectorAll('[data-print-option="'+k+'"]').forEach(n=>n.remove());
  const {w,h}=medidas(p),usable=w-p.esquerda-p.direita;
  frame=document.createElement('iframe');frame.title='Impressão Bebfy';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0';
  document.body.appendChild(frame);
  const doc=frame.contentDocument,win=frame.contentWindow;if(!doc||!win||!doc.body)throw new Error('O navegador não disponibilizou a área de impressão.');
  doc.title='Bebfy — '+documentos[tipo];doc.documentElement.lang='pt-BR';
  const style=doc.createElement('style');
  // Continuous roll height is chosen in the printer driver; CSS cannot guarantee auto-length rolls.
  style.textContent='@page{size:'+(h===null?'auto':w+'mm '+h+'mm')+';margin:'+p.superior+'mm '+p.direita+'mm '+p.inferior+'mm '+p.esquerda+'mm}'+
  '*{box-sizing:border-box;color:#000!important;background:transparent!important;overflow:visible!important;max-height:none!important}html,body{margin:0;padding:0;background:white!important}body{width:'+usable+'mm;max-width:100%;font-family:'+(p.fonte==='monospace'?'monospace':'Arial,sans-serif')+';font-size:'+p.tamanho+'pt;line-height:1.32;overflow-wrap:anywhere}'+
  'body>main,main>article,main>section,main>div{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;position:static!important}h1,h2,h3{font-size:1.15em;margin:.6em 0;font-weight:bold}p{margin:.3em 0}small{font-size:.86em}hr{border:0;border-top:1px dashed #444;margin:.6em 0}'+
  'table{width:100%!important;min-width:0!important;border-collapse:collapse;table-layout:auto;font-size:.9em}th,td{text-align:left;padding:3px;border-bottom:1px solid #bbb;white-space:normal!important;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}'+
  '.flex,.vs-receipt-line,.cl-receipt-line,.dl-line,.vc-line{display:flex;justify-content:space-between;gap:5px}.text-center,header{text-align:center}.font-bold,.font-extrabold,.font-black,.font-semibold{font-weight:bold}.border-dashed,.vs-receipt-meta,.cl-receipt-sep{border-top:1px dashed #444;padding:5px 0}.whitespace-pre-wrap{white-space:pre-wrap}img{max-width:100%}'+
  (usable<100?'table{font-size:.78em}th,td{padding:2px}.dl-detail{display:block}':'');
  doc.head.appendChild(style);
  const main=doc.createElement('main');main.appendChild(doc.importNode(clone,true));doc.body.appendChild(main);
  win.addEventListener('afterprint',cleanup,{once:true});
  timer=window.setTimeout(cleanup,300000);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  win.focus();win.print();
 }catch(e){cleanup();window.alert('Não foi possível preparar a impressão. '+(e instanceof Error?e.message:mensagemErro(e)));}
}
