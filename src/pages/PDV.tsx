import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Printer, RefreshCcw, Search, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bebfy } from '../services/bebfy';
import type { Caixa, ComprovanteNaoFiscal, FormaPagamento, Produto } from '../services/bebfy';

const moeda = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

type Carrinho = { produto: Produto; quantidade: number };

function Comprovante({ dados }: { dados: ComprovanteNaoFiscal }) {
  return (
    <article className="mx-auto max-w-sm space-y-3 bg-white p-6 font-mono text-xs text-black print:max-w-none print:p-0">
      <h2 className="text-center text-base font-extrabold">{dados.titulo}</h2>
      <p className="text-center font-semibold">{dados.loja.nome}</p>
      {dados.loja.endereco && <p className="text-center">{dados.loja.endereco}</p>}
      {dados.loja.telefone && <p className="text-center">{dados.loja.telefone}</p>}
      <div className="border-y border-dashed border-black py-2">
        <p>Venda #{dados.venda.numero} • {new Date(dados.venda.realizadaEm).toLocaleString('pt-BR')}</p>
        <p>Operador: {dados.venda.operador}</p>
        {dados.venda.cliente && <p>Cliente: {dados.venda.cliente}</p>}
      </div>
      {dados.itens.map((item, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span>{item.quantidade}x {item.descricao}</span>
          <span>{moeda(item.total)}</span>
        </div>
      ))}
      <div className="space-y-1 border-t border-dashed border-black pt-2">
        <div className="flex justify-between"><span>Subtotal</span><span>{moeda(dados.valores.subtotal)}</span></div>
        <div className="flex justify-between"><span>Desconto</span><span>{moeda(dados.valores.desconto)}</span></div>
        <div className="flex justify-between font-bold"><span>Total</span><span>{moeda(dados.valores.total)}</span></div>
      </div>
      {dados.pagamentos.map((p, i) => (
        <p key={i}>{p.forma}: {moeda(p.valor)}{p.troco > 0 ? ` • Troco: ${moeda(p.troco)}` : ''}</p>
      ))}
      <p className="border-t border-dashed border-black pt-3 text-center font-bold uppercase">{dados.aviso}</p>
    </article>
  );
}

export function PDV() {
  const { user, empresa } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<Carrinho[]>([]);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [busca, setBusca] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [forma, setForma] = useState<FormaPagamento>('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [comprovante, setComprovante] = useState<ComprovanteNaoFiscal | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregar = useCallback(async () => {
    if (!user?.funcionarioId) return;
    setCarregando(true);
    setErro('');
    try {
      const [catalogo, caixaAberto] = await Promise.all([
        bebfy.produtos.listar(),
        bebfy.caixa.abertoPorOperador(user.funcionarioId).catch((e: unknown) => {
          if (typeof e === 'object' && e && 'response' in e &&
              (e as { response?: { status?: number } }).response?.status === 404) return null;
          throw e;
        }),
      ]);
      setProdutos(catalogo.filter(p => p.ativo));
      setCaixa(caixaAberto);
    } catch {
      setErro('Não foi possível obter o catálogo ou o caixa. Verifique a conexão com a API.');
    } finally {
      setCarregando(false);
    }
  }, [user?.funcionarioId]);

  useEffect(() => { void carregar(); }, [carregar]);

  const subtotal = useMemo(
    () => carrinho.reduce((v, item) => v + Number(item.produto.precoVendaVarejo) * item.quantidade, 0),
    [carrinho],
  );
  const descontoValor = Math.max(0, Number(desconto) || 0);
  const total = Math.max(0, Math.round((subtotal - descontoValor) * 100) / 100);
  const recebido = Number(valorRecebido);
  const troco = forma === 'DINHEIRO' && Number.isFinite(recebido)
    ? Math.max(0, Math.round((recebido - total) * 100) / 100) : 0;

  const adicionar = (produto: Produto) => {
    if (produto.estoqueAtual < 1) return;
    setCarrinho(atual => {
      const item = atual.find(p => p.produto.id === produto.id);
      if (item) {
        return atual.map(p => p.produto.id === produto.id
          ? { ...p, quantidade: Math.min(produto.estoqueAtual, p.quantidade + 1) } : p);
      }
      return [...atual, { produto, quantidade: 1 }];
    });
    setComprovante(null);
    setSucesso('');
  };

  const alterarQuantidade = (id: number, diferenca: number) =>
    setCarrinho(atual => atual
      .map(item => item.produto.id === id
        ? { ...item, quantidade: Math.max(0, Math.min(item.produto.estoqueAtual, item.quantidade + diferenca)) } : item)
      .filter(item => item.quantidade > 0));

  async function abrirCaixa() {
    if (!user?.funcionarioId || salvando) return;
    const valor = Number(saldoInicial);
    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um saldo inicial válido.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      setCaixa(await bebfy.caixa.abrir({ operadorId: user.funcionarioId, saldoInicial: valor }));
      setSucesso('Caixa aberto e pronto para vendas.');
    } catch {
      setErro('Não foi possível abrir o caixa. Confirme as permissões e o estado do operador.');
    } finally {
      setSalvando(false);
    }
  }

  async function finalizar() {
    if (salvando || !caixa || !user?.funcionarioId || carrinho.length === 0) return;
    if (descontoValor > subtotal) {
      setErro('O desconto não pode superar o subtotal.');
      return;
    }
    if (total <= 0) {
      setErro('A venda deve possuir valor positivo.');
      return;
    }
    if (forma === 'FIADO') {
      setErro('Vendas fiadas exigem seleção de cliente. Use o módulo de clientes antes de habilitar esta opção no PDV.');
      return;
    }
    if (forma === 'DINHEIRO' && (!Number.isFinite(recebido) || recebido < total)) {
      setErro('Informe o valor em dinheiro recebido, igual ou superior ao total.');
      return;
    }
    setSalvando(true);
    setErro('');
    setSucesso('');
    try {
      const venda = await bebfy.vendas.registrar({
        caixaId: caixa.id,
        funcionarioId: user.funcionarioId,
        itens: carrinho.map(item => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          precoUnitario: Number(item.produto.precoVendaVarejo),
        })),
        desconto: descontoValor,
        pagamentos: [{
          formaPagamento: forma,
          valor: forma === 'DINHEIRO' ? recebido : total,
          ...(troco > 0 ? { troco } : {}),
        }],
      });
      // A venda já está persistida: falha de impressão não deve repetir a cobrança.
      setCarrinho([]);
      setDesconto('0');
      setValorRecebido('');
      setSucesso(`Venda #${venda.codigoVenda} registrada com sucesso.`);
      void carregar();
      try {
        setComprovante(await bebfy.vendas.comprovante(venda.id));
      } catch {
        setComprovante(null);
        setErro(`Venda #${venda.codigoVenda} registrada, mas não foi possível carregar o comprovante. Consulte o histórico para imprimir depois; não repita a venda.`);
      }
    } catch {
      setErro('A venda não foi concluída. Confira estoque, caixa e permissões antes de tentar novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const filtrados = produtos.filter(p => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return !termo || p.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
      (p.codigoBarras || '').includes(termo);
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="print:hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" aria-label="Voltar ao painel" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={20} /></Link>
            <div><h1 className="text-xl font-bold">Frente de caixa · Bebfy</h1><p className="text-xs text-slate-500">{empresa?.nomeFantasia} · {user?.nome}</p></div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 font-semibold ${caixa ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
              {caixa ? 'Caixa aberto' : 'Caixa fechado'}
            </span>
            <button onClick={() => void carregar()} disabled={carregando} className="rounded-lg border border-slate-300 p-2 disabled:opacity-50 dark:border-slate-700" aria-label="Atualizar produtos e caixa"><RefreshCcw size={18} /></button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 lg:p-6">
          {erro && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erro}</div>}
          {sucesso && <div role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{sucesso}</div>}
          {!caixa ? (
            <section className="mx-auto max-w-md rounded-2xl bg-white p-7 shadow-sm dark:bg-slate-900">
              <Wallet size={30} className="mb-3 text-teal-600" />
              <h2 className="mb-2 text-xl font-bold">Abrir caixa</h2>
              <p className="mb-4 text-sm text-slate-500">Informe o valor inicial disponível para troco.</p>
              <label htmlFor="saldo-inicial" className="mb-1 block text-sm font-medium">Saldo inicial (R$)</label>
              <input id="saldo-inicial" type="number" min="0" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)}
                className="mb-4 w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" />
              <button onClick={() => void abrirCaixa()} disabled={salvando || carregando}
                className="w-full rounded-xl bg-teal-700 py-3 font-semibold text-white disabled:opacity-50">{salvando ? 'Abrindo…' : 'Abrir meu caixa'}</button>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
              <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-bold">Produtos</h2>
                  <span className="text-xs text-slate-500">{filtrados.length} encontrado(s)</span>
                </div>
                <div className="relative mb-4">
                  <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input aria-label="Pesquisar produto por nome ou código de barras" placeholder="Nome ou código de barras..." value={busca} onChange={e => setBusca(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-transparent py-3 pl-10 pr-4 outline-teal-500 dark:border-slate-700" />
                </div>
                <div className="grid max-h-[65vh] gap-3 overflow-y-auto sm:grid-cols-2">
                  {filtrados.map(produto => (
                    <button key={produto.id} onClick={() => adicionar(produto)} disabled={produto.estoqueAtual < 1}
                      className="rounded-xl border border-slate-200 p-4 text-left hover:border-teal-500 disabled:opacity-40 dark:border-slate-700">
                      <div className="mb-2 flex justify-between gap-2">
                        <span className="font-semibold">{produto.nome}</span><Plus size={17} className="shrink-0 text-teal-600" />
                      </div>
                      <p className="text-xs text-slate-500">Estoque: {produto.estoqueAtual} · {produto.codigoBarras || 'Sem EAN'}</p>
                      <p className="mt-2 text-lg font-bold text-teal-700 dark:text-teal-400">{moeda(Number(produto.precoVendaVarejo))}</p>
                    </button>
                  ))}
                  {!carregando && filtrados.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-2">Nenhum produto encontrado.</p>}
                </div>
              </section>
              <section className="self-start rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
                <h2 className="mb-4 flex items-center gap-2 font-bold"><ShoppingCart size={20} /> Venda atual</h2>
                <div className="max-h-[38vh] space-y-3 overflow-y-auto">
                  {carrinho.map(item => (
                    <div key={item.produto.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="mb-2 flex justify-between gap-2">
                        <span className="text-sm font-semibold">{item.produto.nome}</span>
                        <button onClick={() => setCarrinho(atual => atual.filter(p => p.produto.id !== item.produto.id))}
                          title="Remover item" aria-label={`Remover ${item.produto.nome}`}><Trash2 size={17} className="text-red-500" /></button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => alterarQuantidade(item.produto.id, -1)} aria-label="Diminuir quantidade"><Minus size={16} /></button>
                          <span className="font-bold">{item.quantidade}</span>
                          <button onClick={() => alterarQuantidade(item.produto.id, 1)} aria-label="Aumentar quantidade"><Plus size={16} /></button>
                        </div>
                        <strong>{moeda(Number(item.produto.precoVendaVarejo) * item.quantidade)}</strong>
                      </div>
                    </div>
                  ))}
                  {carrinho.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Adicione produtos para começar.</p>}
                </div>
                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{moeda(subtotal)}</span></div>
                  <label htmlFor="desconto-pdv" className="block text-sm">Desconto (R$)</label>
                  <input id="desconto-pdv" type="number" min="0" max={subtotal} step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-transparent p-2.5 dark:border-slate-700" />
                  <div className="flex justify-between text-xl font-extrabold"><span>Total</span><span className="text-teal-700 dark:text-teal-400">{moeda(total)}</span></div>
                  <label htmlFor="pagamento-pdv" className="block text-sm">Forma de pagamento</label>
                  <select id="pagamento-pdv" value={forma} onChange={e => setForma(e.target.value as FormaPagamento)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="DINHEIRO">Dinheiro</option><option value="PIX">PIX</option>
                    <option value="CARTAO_DEBITO">Cartão de débito</option><option value="CARTAO_CREDITO">Cartão de crédito</option>
                  </select>
                  {forma === 'DINHEIRO' && (
                    <>
                      <label htmlFor="valor-recebido" className="block text-sm">Valor recebido (R$)</label>
                      <input id="valor-recebido" type="number" min="0" step="0.01" value={valorRecebido} onChange={e => setValorRecebido(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" />
                      <p className="text-sm text-slate-500">Troco: <strong>{moeda(troco)}</strong></p>
                    </>
                  )}
                  <button onClick={() => void finalizar()} disabled={salvando || carrinho.length === 0 || total <= 0}
                    className="w-full rounded-xl bg-teal-700 p-3.5 font-bold text-white hover:bg-teal-800 disabled:opacity-50">
                    {salvando ? 'Finalizando…' : 'Finalizar venda'}
                  </button>
                  <p className="text-center text-xs text-slate-500">O comprovante gerado não tem valor fiscal.</p>
                </div>
              </section>
            </div>
          )}
          {comprovante && (
            <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-bold">Comprovante da última venda</h2>
                <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-white"><Printer size={17} /> Imprimir</button>
              </div>
              <Comprovante dados={comprovante} />
            </section>
          )}
        </div>
      </div>
      {comprovante && <div className="hidden print:block"><Comprovante dados={comprovante} /></div>}
    </main>
  );
}
