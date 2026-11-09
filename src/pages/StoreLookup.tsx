import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Layers3 } from 'lucide-react';
import { tenantPath, validSlug } from '../services/tenantUrls';

export function StoreLookup() {
  const [slug,setSlug]=useState('');
  const [erro,setErro]=useState('');
  const navigate=useNavigate();
  const entrar=(e:React.FormEvent)=>{
    e.preventDefault();
    const normalized=slug.trim().toLowerCase();
    if(!validSlug(normalized)){
      setErro('Informe o identificador válido da distribuidora (somente letras, números e hífens).');
      return;
    }
    navigate(tenantPath('',normalized));
  };
  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#071b21] to-[#105148] p-4 text-white">
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#102d34] p-7 shadow-2xl sm:p-9">
      <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black"><Layers3 className="text-emerald-300"/> bebfy.</Link>
      <div className="mt-8 grid h-14 w-14 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Building2 size={28}/></div>
      <h1 className="mt-5 text-3xl font-extrabold">Acesse sua distribuidora</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Digite o endereço da sua loja para abrir o login individual.</p>
      <form className="mt-6" onSubmit={entrar}>
        <label htmlFor="identificador-loja" className="block text-sm font-bold">Identificador da loja</label>
        <div className="mt-2 flex overflow-hidden rounded-xl border border-white/15 bg-[#071d24] focus-within:border-emerald-300">
          <span className="px-4 py-3.5 text-sm text-slate-400">bebfy.com.br/</span>
          <input id="identificador-loja" autoFocus required value={slug} onChange={e=>{setSlug(e.target.value);setErro('')}} placeholder="minha-loja" className="min-w-0 flex-1 bg-transparent pr-4 text-sm text-white outline-none" />
        </div>
        {erro&&<p role="alert" className="mt-3 text-sm text-rose-300">{erro}</p>}
        <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3.5 font-extrabold text-[#062b2b]" type="submit">Continuar <ArrowRight size={18}/></button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-400">Não sabe o identificador? Solicite ao administrador da sua distribuidora.</p>
    </div>
  </main>;
}
