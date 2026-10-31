import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sun,
  Moon,
  Lock,
  UserCheck,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Package,
  FileText,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!loginInput || !senhaInput) {
      setErro('Preencha o código/CPF e a senha.');
      return;
    }

    try {
      setCarregando(true);
      await login({
        login: loginInput,
        senha: senhaInput,
      });

      navigate('/pdv');
    } catch (err: any) {
      const mensagemErro =
        err.response?.data?.message || 'Erro ao conectar com o servidor.';
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-500 dark:bg-linear-to-br dark:from-slate-950 dark:via-[#06181a] dark:to-slate-950 bg-linear-to-br from-slate-200 via-slate-100 to-[#e2f0f2]">
      
      {/* Esferas de Iluminação de Fundo */}
      <div className="absolute top-1/4 left-1/4 w-125 h-125 bg-petrol-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ================= PAINEL RETANGULAR 3D ================= */}
      <div className="box-3d w-full max-w-6xl min-h-150 rounded-3xl border flex flex-col md:flex-row overflow-hidden relative z-10 backdrop-blur-xl dark:bg-slate-900/90 dark:border-slate-800/80 bg-white/95 border-slate-300">
        
        {/* ---------------- METADE ESQUERDA (50%): APRESENTAÇÃO & LOGO ---------------- */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between dark:bg-slate-900/80 bg-slate-50/70 border-b md:border-b-0 md:border-r dark:border-slate-800/80 border-slate-200">
          
          {/* Topo: Logo + Tag Versão */}
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-sm shrink-0">
              <img
                src="/logo.png"
                alt="Bebfy"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-wider dark:text-white text-slate-900">
                  BEBFY
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md dark:bg-amber-500/20 bg-amber-100 dark:text-amber-400 text-amber-800 border dark:border-amber-500/30 border-amber-300">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs dark:text-slate-400 text-slate-500 font-medium mt-0.5">
                Solução Inteligente para Gestão de Bebidas
              </p>
            </div>
          </div>

          {/* Centro: Chamada e Grid de Módulos com Animação no Hover */}
          <div className="space-y-6 my-auto pt-8 pb-8">
            
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full dark:bg-petrol-900/90 dark:text-petrol-300 dark:border dark:border-petrol-600/60 bg-petrol-100 text-petrol-900 border border-petrol-300 shadow-sm">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>Desenvolvido para Distribuidoras & Conveniências</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight dark:text-white text-slate-900 leading-snug">
              Controle total do balcão <br />
              ao <span className="text-amber-500">financeiro em tempo real.</span>
            </h2>

            {/* Grid Retangular com Efeito Hover 3D nos Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* Card 1 */}
              <div className="group p-3.5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:border-petrol-500/60 hover:border-petrol-400/60 dark:bg-slate-950/70 bg-white dark:border-slate-800 border-slate-200/80 shadow-sm flex items-start gap-3 cursor-default">
                <div className="p-2 rounded-lg dark:bg-petrol-900/60 bg-petrol-50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <ShoppingBag size={18} className="dark:text-petrol-300 text-petrol-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold dark:text-white text-slate-900 transition-colors duration-200 group-hover:text-amber-500 dark:group-hover:text-amber-400">
                    Frente de Caixa
                  </h3>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-tight mt-0.5">Bipagem EAN e atalhos.</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group p-3.5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:border-petrol-500/60 hover:border-petrol-400/60 dark:bg-slate-950/70 bg-white dark:border-slate-800 border-slate-200/80 shadow-sm flex items-start gap-3 cursor-default">
                <div className="p-2 rounded-lg dark:bg-petrol-900/60 bg-petrol-50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <CreditCard size={18} className="dark:text-petrol-300 text-petrol-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold dark:text-white text-slate-900 transition-colors duration-200 group-hover:text-amber-500 dark:group-hover:text-amber-400">
                    Caderneta Fiado
                  </h3>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-tight mt-0.5">Limites e histórico.</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group p-3.5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:border-petrol-500/60 hover:border-petrol-400/60 dark:bg-slate-950/70 bg-white dark:border-slate-800 border-slate-200/80 shadow-sm flex items-start gap-3 cursor-default">
                <div className="p-2 rounded-lg dark:bg-petrol-900/60 bg-petrol-50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <Package size={18} className="dark:text-petrol-300 text-petrol-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold dark:text-white text-slate-900 transition-colors duration-200 group-hover:text-amber-500 dark:group-hover:text-amber-400">
                    Lotes & Cascos
                  </h3>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-tight mt-0.5">Validade e vasilhames.</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="group p-3.5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:border-petrol-500/60 hover:border-petrol-400/60 dark:bg-slate-950/70 bg-white dark:border-slate-800 border-slate-200/80 shadow-sm flex items-start gap-3 cursor-default">
                <div className="p-2 rounded-lg dark:bg-petrol-900/60 bg-petrol-50 shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <FileText size={18} className="dark:text-petrol-300 text-petrol-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold dark:text-white text-slate-900 transition-colors duration-200 group-hover:text-amber-500 dark:group-hover:text-amber-400">
                    Entrada XML
                  </h3>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-tight mt-0.5">NF-e automatizada.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Rodapé da Esquerda */}
          <div className="text-xs dark:text-slate-500 text-slate-400">
            &copy; 2026 Bebfy Inc. Todos os direitos reservados.
          </div>
        </div>

        {/* ---------------- METADE DIREITA (50%): FORMULÁRIO DE LOGIN ---------------- */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between dark:bg-slate-950 bg-white">
          
          {/* Topo Direita: Alternador de Tema */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold dark:text-white text-slate-900">Acessar Sistema</h2>
              <ShieldCheck size={20} className="text-amber-500" />
            </div>

            <button
              onClick={toggleTheme}
              type="button"
              title="Alternar Tema"
              className="p-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 dark:bg-slate-900 dark:border-slate-800 dark:text-amber-400 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Formulário */}
          <div className="my-auto py-6 space-y-5">
            
            {erro && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl">
                <AlertCircle size={18} className="shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Código / CPF / E-mail */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 dark:text-slate-300 text-slate-700">
                  Código do Operador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: 1, 10"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition-all focus:outline-none border bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-petrol-600 dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-950 dark:focus:border-petrol-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Senha com Olhinho */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider dark:text-slate-300 text-slate-700">
                    Senha de Acesso
                  </label>
                  <a href="#esqueceu" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={senhaInput}
                    onChange={(e) => setSenhaInput(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-11 py-3.5 text-sm font-semibold transition-all focus:outline-none border bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-petrol-600 dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-950 dark:focus:border-petrol-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Botão Submeter */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm cursor-pointer dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 bg-petrol-800 hover:bg-petrol-700 text-white mt-4"
              >
                {carregando ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  'Autenticar no Bebfy'
                )}
              </button>
            </form>
          </div>

          {/* Rodapé Direita */}
          <div className="text-center text-xs dark:text-slate-500 text-slate-400 pt-4">
            Bebfy Enterprise &copy; 2026 — Terminal de Operações
          </div>
        </div>

      </div>
    </div>
  );
};