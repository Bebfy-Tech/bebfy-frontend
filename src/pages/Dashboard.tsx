import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, CreditCard, Package, RefreshCcw, ShoppingCart, Users, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bebfy } from '../services/bebfy';
import type { Dashboard as DashboardData } from '../services/bebfy';

const dinheiro = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

function CardMetrica({
  titulo, valor, descricao, icone: Icon,
}: {
  titulo: string; valor: string; descricao: string;
  icone: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</span>
        <Icon size={19} className="text-teal-600 dark:text-teal-400" />
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{valor}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
    </div>
  );
}

export function Dashboard() {
  const { user, empresa, logout } = useAuth();
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const atualizar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await bebfy.dashboard());
    } catch {
      setErro('Não foi possível carregar os indicadores. Confira a conexão com a API e a empresa selecionada.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void atualizar(); }, [atualizar]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">Bebfy · Gestão de bebidas</p>
            <h1 className="text-xl font-bold">{empresa?.nomeFantasia || 'Painel da distribuidora'}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">Olá, {user?.nome}</span>
            <Link to="/pdv" className="rounded-xl bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800">Abrir PDV</Link>
            <button onClick={logout} className="rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-700">Sair</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Visão geral</h2>
            <p className="mt-1 text-sm text-slate-500">Dados reais da sua distribuidora, fornecidos pela API.</p>
          </div>
          <button onClick={() => void atualizar()} disabled={carregando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900">
            <RefreshCcw size={15} className={carregando ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        {erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{erro}</div>}

        {carregando && !dados ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">Carregando indicadores…</div>
        ) : dados ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CardMetrica titulo="Faturamento de hoje" valor={dinheiro(dados.faturamentoHoje)} descricao={`${dados.totalVendasHoje} venda(s) concluída(s)`} icone={Wallet} />
              <CardMetrica titulo="Faturamento do mês" valor={dinheiro(dados.faturamentoMes)} descricao={`${dados.totalVendasMes} venda(s) neste mês`} icone={BarChart3} />
              <CardMetrica titulo="Fiado a receber" valor={dinheiro(dados.totalFiadoAReceber)} descricao="Saldo devedor registrado" icone={CreditCard} />
              <CardMetrica titulo="Clientes cadastrados" valor={String(dados.totalClientesDevedores)} descricao="Quantidade retornada pelo relatório" icone={Users} />
            </section>

            <section className="grid gap-5 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-bold">Produtos mais vendidos</h3>
                  <Package className="text-slate-400" size={18} />
                </div>
                {dados.topProdutosMaisVendidos.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">Nenhuma venda registrada ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {dados.topProdutosMaisVendidos.map((item, index) => (
                      <div key={item.produto?.id ?? index} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.produto?.nome ?? 'Produto indisponível'}</p>
                          <p className="text-xs text-slate-500">{item.quantidadeVendida} unidade(s) vendida(s)</p>
                        </div>
                        <strong className="shrink-0 text-sm">{dinheiro(item.totalArrecadado)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-3 font-bold">Caixas abertos</h3>
                  <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">{dados.caixasAtivos.length}</p>
                  <p className="mt-1 text-sm text-slate-500">Operações em andamento</p>
                </div>
                <Link to="/pdv" className="flex items-center justify-between rounded-2xl bg-slate-900 p-5 text-white hover:bg-slate-800 dark:bg-teal-800">
                  <span className="flex items-center gap-3 font-semibold"><ShoppingCart size={20} /> Frente de caixa</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
