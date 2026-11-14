import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CircleHelp, FileUp, Package, Search, ShoppingCart, Wallet, Keyboard, ShieldCheck } from 'lucide-react';
import { tenantPath } from '../services/tenantUrls';
import { card, input } from '../components/ui';

const steps=[
  {n:'01',title:'Cadastre os produtos',desc:'Informe nome, preço, código de barras e estoque inicial. Você pode calcular o preço a partir do custo.',to:'produtos',icon:Package},
  {n:'02',title:'Confira seu estoque',desc:'Registre entradas e saídas ou importe um XML de NF-e. Verifique cada produto antes de confirmar.',to:'estoque',icon:FileUp},
  {n:'03',title:'Abra o caixa',desc:'Informe o valor disponível na gaveta para troco. Só depois comece a vender.',to:'caixas',icon:Wallet},
  {n:'04',title:'Faça uma venda',desc:'Abra o PDV, encontre os itens, escolha pagamento e confira o total. Pressione F9 para finalizar.',to:'pdv',icon:ShoppingCart},
];
const help=[
  {q:'Como faço a primeira venda?',a:'Abra Frente de caixa / PDV. Se o caixa estiver fechado, informe o saldo inicial. Adicione os produtos, escolha a forma de pagamento e finalize.'},
  {q:'Como uso o leitor de código de barras?',a:'No PDV, pressione F2 e bip o código no campo de busca. Pressione Enter para adicionar automaticamente o produto correspondente.'},
  {q:'Como calcular o troco?',a:'Adicione os produtos e selecione Dinheiro. Digite quanto o cliente entregou; o Bebfy mostra o troco em destaque antes da confirmação.'},
  {q:'Como cadastrar um novo produto?',a:'Abra Produtos, clique em Novo cadastro e preencha o essencial. Preço pode ser calculado por percentual sobre o custo. Salve e volte ao PDV.'},
  {q:'Como importar o XML de uma nota?',a:'Vá a Estoque > Importar NF-e XML. Selecione o arquivo, confira a nota e associe os itens aos seus produtos. O Bebfy não consulta a SEFAZ; a conferência é sua.'},
  {q:'Como registrar entrada de estoque?',a:'Abra Movimentações de estoque, clique em Novo cadastro, escolha produto e Entrada de compra ou Ajuste positivo. Informe a quantidade e o motivo.'},
  {q:'Como vender fiado?',a:'Cadastre o cliente, abra o PDV, selecione o cliente e escolha Fiado. Para receber depois, vá a Fiados e recebimentos.'},
  {q:'Como fechar o caixa?',a:'Em Controle de caixas, selecione Fechar caixa e informe o dinheiro contado na gaveta. Compare o valor físico com o valor calculado pelo sistema.'},
  {q:'O Bebfy emite nota fiscal?',a:'Não nesta fase. Os comprovantes do PDV são internos e não fiscais. A importação de XML de compra não equivale à emissão fiscal.'},
];
export function AjudaPage(){
  const [query,setQuery]=useState('');
  const matches=useMemo(()=>help.filter(h=>[h.q,h.a].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),[query]);
  return <main className="space-y-6">
    <header className="rounded-3xl border border-blue-500/20 bg-linear-to-r from-[#101b30] to-[#0b1d1d] p-6 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-emerald-300"><BookOpen size={17}/> Central de ajuda Bebfy</p>
      <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Aprenda o básico em minutos.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Sem termos complicados. Siga os passos abaixo ou pesquise sua dúvida. Se você não encontrar uma opção, talvez seu perfil não tenha permissão para utilizá-la.</p>
      <label className="relative mt-6 block max-w-xl"><Search className="absolute left-4 top-3.5 text-slate-400" size={18}/><input aria-label="Pesquisar ajuda" className={`${input} pl-11`} placeholder="Ex.: vender fiado, abrir caixa, importar XML" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    </header>
    <section aria-label="Primeiros passos">
      <h2 className="mb-4 text-xl font-extrabold text-white">Comece por aqui</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map(({n,title,desc,to,icon:Icon})=><Link to={tenantPath(to)} key={n} className={`${card} group flex items-start gap-4 p-5 transition hover:border-blue-500/40 hover:bg-[#10192a]`}>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300"><Icon size={23}/></div>
          <div className="min-w-0 flex-1"><span className="text-xs font-black tracking-widest text-emerald-300">PASSO {n}</span><h3 className="mt-1 text-base font-extrabold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-300">Abrir tela <ArrowRight size={15}/></span></div>
        </Link>)}
      </div>
    </section>
    <section className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className={`${card} p-5 sm:p-7`}>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-white"><CircleHelp size={22} className="text-emerald-300"/> Dúvidas comuns</h2>
        <div className="mt-5 space-y-3">{matches.map(h=><details key={h.q} className="group rounded-xl border border-[#253247] bg-[#11192a] p-4"><summary className="cursor-pointer list-none pr-4 text-sm font-bold text-slate-100">{h.q}</summary><p className="mt-3 border-t border-[#253247] pt-3 text-sm leading-7 text-slate-400">{h.a}</p></details>)}
          {!matches.length&&<p className="rounded-xl border border-dashed border-[#30405b] p-5 text-sm text-slate-400">Nenhuma resposta encontrada. Tente uma palavra diferente, como "caixa" ou "estoque".</p>}
        </div>
      </div>
      <div className="space-y-4">
        <aside className={`${card} p-5`}>
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><Keyboard size={19} className="text-blue-300"/> Atalhos do PDV</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-400">Buscar produto</span><kbd className="rounded-md border border-[#32415a] bg-[#151f30] px-2 py-1 text-white">F2</kbd></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Finalizar venda</span><kbd className="rounded-md border border-[#32415a] bg-[#151f30] px-2 py-1 text-white">F9</kbd></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Leitor de código</span><kbd className="rounded-md border border-[#32415a] bg-[#151f30] px-2 py-1 text-white">Enter</kbd></div>
          </div>
        </aside>
        <aside className={`${card} p-5`}>
          <p className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={19} className="text-emerald-300"/> Segurança da operação</p>
          <p className="mt-3 text-xs leading-6 text-slate-400">Cada funcionário deve utilizar seu próprio acesso. Se uma função estiver indisponível, peça ao responsável da loja que revise as permissões.</p>
          <Link to={tenantPath('configuracoes')} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">Minha conta <ArrowRight size={15}/></Link>
        </aside>
      </div>
    </section>
  </main>;
}
