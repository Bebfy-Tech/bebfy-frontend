import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, CreditCard, Package, ShoppingCart,
  Users, Wallet, TrendingUp, Clock3, CircleDollarSign, ShieldCheck,
} from 'lucide-react';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import type { Dashboard as DashboardData } from '../services/bebfy';
import { card, dinheiro, mensagemErro, Notice, PageTitle } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, empresa } = useAuth();
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setErro('');
    try { setDados(await bebfy.dashboard()); }
    catch (e) { setErro(mensagemErro(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const ticket = Number(dados?.totalVendasHoje || 0) > 0
    ? Number(dados?.faturamentoHoje || 0) / Number(dados?.totalVendasHoje)
    : 0;
  const cards = [
    { nome: 'Faturamento de hoje', valor: dinheiro(dados?.faturamentoHoje), desc: 'Receita registrada no dia', Icon: CircleDollarSign, accent: 'text-emerald-300', iconBg: 'bg-emerald-500/10' },
    { nome: 'Vendas realizadas', valor: String(dados?.totalVendasHoje ?? 0), desc: 'Vendas concluídas hoje', Icon: ShoppingCart, accent: 'text-blue-300', iconBg: 'bg-blue-500/10' },
    { nome: 'Ticket médio', valor: dinheiro(ticket), desc: 'Valor médio por venda hoje', Icon: TrendingUp, accent: 'text-violet-300', iconBg: 'bg-violet-500/10' },
    { nome: 'Fiado a receber', valor: dinheiro(dados?.totalFiadoAReceber), desc: `${dados?.totalClientesDevedores ?? 0} cliente(s) devedores`, Icon: CreditCard, accent: 'text-amber-300', iconBg: 'bg-amber-500/10' },
  ];
  const actions = [
    { to: '/pdv', nome: 'Abrir frente de caixa', descricao: 'Começar a vender agora', Icon: ShoppingCart, color: 'bg-emerald-500 text-[#052015]' },
    { to: '/produtos', nome: 'Gerenciar produtos', descricao: 'Cadastros, preços e lotes', Icon: Boxes, color: 'bg-blue-600 text-white' },
    { to: '/fiados', nome: 'Receber fiado', descricao: 'Abater saldo de cliente', Icon: Users, color: 'bg-[#1a293e] text-slate-100' },
  ];

  return <div className="space-y-6">
    <PageTitle title="Visão geral" subtitle={`Bem-vindo, ${user?.nome || 'operador'}! Acompanhe o movimento da ${empresa?.nomeFantasia || 'sua distribuidora'}.`} onReload={() => void load()} loading={loading}/>
    <Notice message={erro}/>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[.05] px-5 py-3">
      <span className="flex items-center gap-2 text-xs font-bold text-emerald-300"><ShieldCheck size={16}/> Dashboard conectado ao Bebfy</span>
      <span className="flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14}/> Atualizado ao carregar esta página</span>
    </div>
    {loading && !dados ? <div className={`${card} p-12 text-center text-sm text-slate-400`}>Carregando indicadores da distribuidora...</div> : <>
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Indicadores do dia">
        {cards.map(({ nome, valor, desc, Icon, accent, iconBg }) =>
          <article className={`${card} p-5 sm:p-6`} key={nome}>
            <div className="mb-6 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-400">{nome}</span>
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${iconBg} ${accent}`}><Icon size={21}/></span>
            </div>
            <strong className="block text-[clamp(1.4rem,2.5vw,2rem)] font-black tracking-tight text-white">{valor}</strong>
            <p className="mt-2 text-xs text-slate-500">{desc}</p>
          </article>)}
      </section>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Ações rápidas">
        {actions.map(({to,nome,descricao,Icon,color})=>
          <Link key={to} to={tenantPath(to)} className={`flex min-h-24 items-center gap-4 rounded-2xl px-5 py-5 shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 ${color}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Icon size={23}/></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold">{nome}</strong><span className="mt-1 block text-xs opacity-70">{descricao}</span></span><ArrowRight size={18}/>
          </Link>)}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className={`${card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-extrabold">Produtos mais vendidos</h2><p className="mt-1 text-xs text-slate-400">Ranking real da API do Bebfy</p></div>
            <Link to={tenantPath('relatorios')} className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">Relatórios <ArrowRight size={15}/></Link>
          </div>
          <div className="mt-6 space-y-3">
            {dados?.topProdutosMaisVendidos.map((item,index)=>
              <div className="flex items-center gap-3 rounded-xl border border-[#253247] bg-[#101827] p-3" key={item.produto?.id ?? index}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><Package size={20}/></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.produto?.nome || 'Produto removido'}</p><p className="text-xs text-slate-500">{item.quantidadeVendida} unidade(s)</p></div>
                <strong className="text-sm text-emerald-300">{dinheiro(item.totalArrecadado)}</strong>
              </div>)}
            {!dados?.topProdutosMaisVendidos?.length && <div className="rounded-xl border border-dashed border-[#31405b] p-8 text-center"><Boxes className="mx-auto text-blue-300" size={28}/><p className="mt-3 text-sm text-slate-400">O ranking aparecerá após as primeiras vendas.</p><Link to={tenantPath('pdv')} className="mt-3 inline-flex text-sm font-bold text-emerald-300">Iniciar venda <ArrowRight size={16}/></Link></div>}
          </div>
        </section>
        <section className={`${card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Resumo operacional</h2><BarChart3 className="text-blue-300" size={21}/></div>
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#263246] bg-[#101827] p-4"><p className="text-xs text-slate-400">Faturamento no mês</p><strong className="mt-2 block text-2xl font-black text-white">{dinheiro(dados?.faturamentoMes)}</strong></div>
            <div className="rounded-xl border border-[#263246] bg-[#101827] p-4"><p className="text-xs text-slate-400">Caixas em operação</p><strong className="mt-2 block text-2xl font-black text-blue-300">{dados?.caixasAtivos?.length ?? 0}</strong></div>
            <Link to={tenantPath('caixas')} className="flex items-center justify-between rounded-xl border border-emerald-500/20 p-4 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10">Visualizar controle de caixas <ArrowRight size={17}/></Link>
          </div>
        </section>
      </div>
      <section className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Turnos de caixa abertos</h2><Link className="text-xs font-bold text-emerald-300" to={tenantPath('caixas')}>Ver todos</Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dados?.caixasAtivos?.map(c=><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-4" key={c.id}><p className="text-sm font-bold text-emerald-300">● Caixa em operação</p><p className="mt-2 text-xs text-slate-300">Saldo inicial {dinheiro(c.saldoInicial)}</p><p className="mt-1 text-xs text-slate-500">Início: {new Date(c.abertoEm).toLocaleString('pt-BR')}</p></div>)}
          {!dados?.caixasAtivos?.length && <div className="rounded-xl border border-dashed border-[#31405b] p-6 text-sm text-slate-400">Nenhum caixa aberto neste momento.</div>}
        </div>
      </section>
    </>}
  </div>;
}
