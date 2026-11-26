import { useEffect, useState } from 'react';
import { ImagePlus, Package } from 'lucide-react';
import { api } from '../services/api';
import { mensagemErro } from './ui';

/** Compress user-selected raster image to a small JPEG, then persist through the tenant API. */
async function compress(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Selecione JPG, PNG ou WebP de até 8 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Não foi possível processar a foto.');
    for(const size of [480,360,256,160]){
      const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const base64=canvas.toDataURL('image/jpeg',.72).split(',')[1];
      if(base64&&Math.floor(base64.length*3/4)-(base64.endsWith('==')?2:base64.endsWith('=')?1:0)<=65536)return base64;
    }
    throw new Error('Não foi possível reduzir a foto.');
  }finally{bitmap.close();}
}

export function ProdutoFoto({produtoId,editable}:{produtoId:string;editable:boolean}){
  const [foto,setFoto]=useState<string|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const endpoint='/produtos/'+encodeURIComponent(produtoId)+'/foto';
  useEffect(()=>{let alive=true;setBusy(true);setError('');setFoto(null);api.get<{base64:string|null}>(endpoint).then(r=>{if(alive)setFoto(r.data.base64);}).catch(e=>{if(alive)setError(mensagemErro(e));}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[endpoint]);
  const upload=async(file?:File)=>{if(!file||busy)return;setBusy(true);setError('');try{const base64=await compress(file);await api.put(endpoint,{base64});setFoto(base64);}catch(e){setError(mensagemErro(e));}finally{setBusy(false);}};
  const remove=async()=>{if(busy||!window.confirm('Remover a foto deste produto?'))return;setBusy(true);setError('');try{await api.delete(endpoint);setFoto(null);}catch(e){setError(mensagemErro(e));}finally{setBusy(false);}};
  return <div className="bf-product-photo"><div className="bf-product-photo-preview">{foto?<img src={'data:image/jpeg;base64,'+foto} alt="Foto do produto"/>:<Package size={28}/>}</div>{editable&&<div className="bf-product-photo-controls"><label className="inline-flex items-center gap-1"><ImagePlus size={15}/>{busy?'Aguarde…':foto?'Trocar foto':'Adicionar foto'}<input aria-label="Adicionar foto do produto" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value='';}}/></label>{foto&&<button type="button" disabled={busy} onClick={()=>void remove()}>Remover foto</button>}</div>}{error&&<p role="alert" className="bf-product-photo-error">{error}</p>}</div>;
}
