import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BarChart3, Boxes, Building2, CheckCircle2,
  ChevronDown, CreditCard, FileUp, Menu, Package, ShieldCheck,
  ShoppingCart, Users, Wallet, X,
} from 'lucide-react';
import './landing.css';

const modules = [
  { icon: ShoppingCart, title: 'Frente de caixa', description: 'Registre vendas e pagamentos no balcão.' },
  { icon: Boxes, title: 'Estoque e lotes', description: 'Movimentações, quantidades e validade.' },
  { icon: Wallet, title: 'Financeiro', description: 'Acompanhe os registros da operação.' },
  { icon: Users, title: 'Clientes e fiado', description: 'Histórico de clientes e recebimentos.' },
  { icon: FileUp, title: 'Importação de XML', description: 'Entrada manual de arquivos de NF-e.' },
  { icon: BarChart3, title: 'Relatórios', description: 'Indicadores para tomar decisões.' },
  { icon: ShieldCheck, title: 'Equipe e acessos', description: 'Funcionários e permissões por perfil.' },
  { icon: Package, title: 'Produtos', description: 'Cadastros e preços centralizados.' },
];

const previews = {
  dashboard: {
    kicker: 'VISÃO GERAL',
    title: 'Enxergue o movimento do negócio.',
    description: 'Indicadores do dia, produtos mais vendidos e atalhos para a operação, em uma visão clara do que acontece na distribuidora.',
    rows: [['Vendas do dia', '142'], ['Caixas em operação', '2'], ['Ticket médio', 'R$ 59,30']],
  },
  pdv: {
    kicker: 'FRENTE DE CAIXA',
    title: 'Mais agilidade na hora de vender.',
    description: 'Busca rápida de produtos, carrinho, várias formas de pagamento registradas manualmente e comprovante não fiscal.',
    rows: [['Produto adicionado', 'Cerveja 350 ml'], ['Quantidade', '2 unidades'], ['Total demonstrativo', 'R$ 9,80']],
  },
  estoque: {
    kicker: 'ESTOQUE',
    title: 'Tenha clareza sobre cada produto.',
    description: 'Acompanhe quantidades, lotes, validade e entradas de mercadorias sem depender de planilhas espalhadas.',
    rows: [['Produtos cadastrados', '1.284'], ['Movimentação', 'Entrada de estoque'], ['Origem', 'Registro manual / XML']],
  },
} as const;

type Preview = keyof typeof previews;

function Logo({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`lp-brand ${light ? 'lp-brand-light' : ''}`} aria-label="Bebfy — página inicial">
    <img src="/bebfy-logo.svg" alt="bebfy" />
  </Link>;
}

function DashboardMock() {
  return <div className="lp-dashboard-mock" aria-label="Painel ilustrativo do Bebfy, com dados fictícios">
    <div className="lp-mock-sidebar">
      <div className="lp-mock-mark">b.</div>
      <span className="selected"><BarChart3 size={14}/> <span>Visão geral</span></span>
      <span><ShoppingCart size={14}/> <span>PDV</span></span>
      <span><Package size={14}/> <span>Produtos</span></span>
      <span><Boxes size={14}/> <span>Estoque</span></span>
      <span><Wallet size={14}/> <span>Financeiro</span></span>
    </div>
    <div className="lp-mock-main">
      <div className="lp-mock-heading"><strong>Visão geral</strong><span>Últimos 30 dias</span></div>
      <div className="lp-mock-stats">
        <div><small>Faturamento</small><strong>R$ 24.780</strong><span>Exemplo</span></div>
        <div><small>Vendas</small><strong>412</strong><span>Exemplo</span></div>
        <div><small>Ticket médio</small><strong>R$ 60,14</strong><span>Exemplo</span></div>
      </div>
      <div className="lp-mock-chart">
        <div className="lp-mock-chart-head"><strong>Movimento de vendas</strong><span>Dados ilustrativos</span></div>
        <svg viewBox="0 0 450 160" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="lp-chart-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#21bb89" stopOpacity=".27"/><stop offset="1" stopColor="#21bb89" stopOpacity="0"/></linearGradient></defs>
          <path d="M0 138 L35 117 L70 125 L110 89 L150 101 L190 65 L228 77 L267 43 L302 59 L345 21 L385 38 L425 12 L450 22 L450 160 L0 160Z" fill="url(#lp-chart-gradient)"/>
          <path d="M0 138 L35 117 L70 125 L110 89 L150 101 L190 65 L228 77 L267 43 L302 59 L345 21 L385 38 L425 12 L450 22" stroke="#12aa77" strokeWidth="3.5" strokeLinejoin="round" fill="none"/>
        </svg>
        <div className="lp-mock-axis"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div>
      </div>
    </div>
  </div>;
}

function PdvMock() {
  return <div className="lp-pdv-mock" aria-label="Frente de caixa ilustrativa do Bebfy">
    <div className="lp-pdv-top"><strong>Frente de caixa</strong><span>PDV</span></div>
    <div className="lp-pdv-search">Buscar produto ou código de barras</div>
    <div className="lp-pdv-products">
      {[['Cerveja 350ml', 'R$ 4,90'], ['Refrigerante 2L', 'R$ 7,50'], ['Água mineral', 'R$ 2,50'], ['Suco 1L', 'R$ 6,90']].map(([name,price])=>
        <div key={name}><span className="lp-pdv-product-icon"><Package size={16}/></span><small>{name}</small><strong>{price}</strong></div>)}
    </div>
    <div className="lp-pdv-total"><span>Total da venda</span><strong>R$ 14,90</strong></div>
    <div className="lp-pdv-button">Finalizar venda</div>
  </div>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<Preview>('dashboard');
  const active = previews[preview];

  return <div className="lp-new">
    <div className="lp-dark-top" id="inicio">
      <header className="lp-topbar">
        <div className="lp-wrap lp-nav">
          <Logo light />
          <nav id="lp-navigation" className={`lp-links ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
            <a href="#inicio" onClick={()=>setMenuOpen(false)}>Início</a>
            <a href="#funcionalidades" onClick={()=>setMenuOpen(false)}>Funcionalidades</a>
            <a href="#demonstracao" onClick={()=>setMenuOpen(false)}>Demonstração</a>
            <a href="#como-funciona" onClick={()=>setMenuOpen(false)}>Como funciona</a>
            <a href="#duvidas" onClick={()=>setMenuOpen(false)}>Dúvidas</a>
          </nav>
          <div className="lp-nav-actions">
            <Link className="lp-nav-login" to="/acessar">Acessar sistema <ArrowRight size={16}/></Link>
            <button type="button" className="lp-menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label={menuOpen?'Fechar menu':'Abrir menu'} aria-expanded={menuOpen} aria-controls="lp-navigation">{menuOpen?<X size={22}/>:<Menu size={22}/>}</button>
          </div>
        </div>
      </header>
      <main>
        <section className="lp-hero-new">
          <div className="lp-wrap lp-hero-inner">
            <div className="lp-hero-words">
              <div className="lp-eyebrow"><span className="lp-eyebrow-mark"/> GESTÃO INTELIGENTE PARA O MERCADO DE BEBIDAS</div>
              <h1>Sua distribuidora <em>no controle.</em></h1>
              <p>Vendas, estoque, financeiro e equipe em uma plataforma completa, simples e organizada. Feita para distribuidoras, adegas, empórios e atacados de bebidas.</p>
              <div className="lp-hero-ctas">
                <a href="#demonstracao" className="lp-cta-primary">Ver demonstração <ArrowRight size={19}/></a>
                <Link to="/acessar" className="lp-cta-outline">Já sou cliente <ArrowRight size={18}/></Link>
              </div>
              <div className="lp-hero-footnote"><CheckCircle2 size={15}/> Operação conectada <span>·</span> <ShieldCheck size={15}/> Acesso por distribuidora</div>
            </div>
            <div className="lp-hero-graphic">
              <div className="lp-laptop">
                <div className="lp-laptop-screen"><DashboardMock/></div>
                <div className="lp-laptop-base"/>
              </div>
              <div className="lp-pdv-floating"><PdvMock/></div>
              <span className="lp-example-note">PRÉVIA ILUSTRATIVA · DADOS FICTÍCIOS</span>
            </div>
          </div>
        </section>
      </main>
    </div>
    <div className="lp-benefit-strip"><div className="lp-wrap lp-benefits">
      {[
        { icon: ShoppingCart, title: 'Vendas ágeis', desc: 'Um PDV direto para o balcão' },
        { icon: Boxes, title: 'Estoque organizado', desc: 'Produtos, quantidades e lotes' },
        { icon: CreditCard, title: 'Finanças mais claras', desc: 'Registros e indicadores' },
        { icon: Users, title: 'Equipe sob controle', desc: 'Acessos e permissões' },
      ].map(({icon:Icon,title,desc})=><div className="lp-benefit" key={title}><span><Icon size={23}/></span><div><strong>{title}</strong><small>{desc}</small></div></div>)}
    </div></div>
    <section className="lp-modules" id="funcionalidades"><div className="lp-wrap lp-modules-content">
      <div className="lp-modules-intro"><span className="lp-section-label">MÓDULOS DO BEBFY</span><h2>Tudo o que você precisa, <em>em um só lugar.</em></h2><p>Do primeiro atendimento à conferência do estoque, mais organização para a rotina da sua distribuidora.</p><a href="#demonstracao" className="lp-link">Conheça a plataforma <ArrowRight size={17}/></a></div>
      <div className="lp-module-grid">{modules.map(({icon:Icon,title,description})=><article className="lp-module" key={title}><Icon size={24}/><h3>{title}</h3><p>{description}</p></article>)}</div>
    </div></section>
    <section className="lp-how" id="como-funciona"><div className="lp-wrap lp-how-content">
      <div className="lp-how-intro"><span className="lp-section-label">COMO FUNCIONA</span><h2>Em poucos passos, sua operação mais organizada.</h2></div>
      <div className="lp-steps">
        {[
          {icon: Building2,title:'Configure sua distribuidora',text:'Organize os dados, a equipe e os acessos.'},
          {icon: Boxes,title:'Cadastre e controle',text:'Gerencie produtos, preços e estoque.'},
          {icon: BarChart3,title:'Venda com clareza',text:'Registre vendas e acompanhe indicadores.'},
        ].map(({icon:Icon,title,text},i)=><article key={title}><span className="lp-step-number">{i+1}</span><Icon size={27}/><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </div></section>
    <section className="lp-demo-section" id="demonstracao"><div className="lp-wrap">
      <div className="lp-demo-heading"><span className="lp-section-label">CONHEÇA O BEBFY POR DENTRO</span><h2>Uma plataforma para quem está na operação.</h2><p>Conheça os principais fluxos do sistema. Os números e exemplos abaixo são ilustrativos.</p></div>
      <div className="lp-tabs" role="tablist" aria-label="Prévia de módulos">{([
        ['dashboard','Visão geral',BarChart3],['pdv','PDV',ShoppingCart],['estoque','Estoque',Boxes]
      ] as const).map(([key,label,Icon])=><button key={key} type="button" role="tab" aria-selected={preview===key} className={preview===key?'active':''} onClick={()=>setPreview(key)}><Icon size={17}/>{label}</button>)}</div>
      <div className="lp-demo-card"><div className="lp-demo-copy"><span>{active.kicker}</span><h3>{active.title}</h3><p>{active.description}</p><a href="#duvidas">Saiba mais sobre o Bebfy <ArrowUpRight size={17}/></a></div><div className="lp-demo-panel" aria-label="Dados ilustrativos da funcionalidade selecionada"><div className="lp-demo-panel-head"><span>Exemplo de operação</span><span>DEMONSTRAÇÃO</span></div>{active.rows.map(([label,value])=><div key={label} className="lp-demo-row"><span>{label}</span><strong>{value}</strong></div>)}<div className="lp-demo-panel-foot"><CheckCircle2 size={16}/> Interface demonstrativa</div></div></div>
    </div></section>
    <section className="lp-faq-new" id="duvidas"><div className="lp-wrap lp-faq-layout">
      <div><span className="lp-section-label">DÚVIDAS FREQUENTES</span><h2>O essencial, sem complicação.</h2><p>Veja como o Bebfy atende a rotina do mercado de bebidas.</p></div>
      <div className="lp-questions">{[
        ['Para quais negócios o Bebfy foi pensado?', 'Distribuidoras, adegas, empórios e atacados de bebidas que precisam organizar vendas e operações.'],
        ['Posso controlar funcionários e permissões?', 'Sim. O sistema possui gestão de funcionários e controle de permissões por perfil.'],
        ['O Bebfy emite notas fiscais?', 'Não nesta fase. O sistema permite a importação manual de XML de NF-e, mas não emite NF-e nem NFC-e.'],
        ['O sistema confirma pagamentos automaticamente?', 'Não. Pagamentos como Pix e cartão são registrados manualmente, sem integração automática com bancos ou adquirentes.'],
        ['Como entro na minha distribuidora?', 'Clique em “Já sou cliente”, informe o identificador da sua empresa e prossiga com seu código e senha.'],
      ].map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={18}/></summary><p>{answer}</p></details>)}</div>
    </div></section>
    <section className="lp-final"><div className="lp-wrap lp-final-inner"><span className="lp-section-label">SEU NEGÓCIO NO PRÓXIMO NÍVEL</span><h2>Mais organização para o presente. <em>Mais espaço para crescer.</em></h2><p>Descubra como o Bebfy pode simplificar a gestão da sua distribuidora.</p><a href="#demonstracao" className="lp-cta-primary">Explorar a demonstração <ArrowRight size={18}/></a></div></section>
    <footer className="lp-footer-new"><div className="lp-wrap lp-footer-content"><div><Logo light/><p>Gestão inteligente para quem movimenta o mercado de bebidas.</p></div><nav aria-label="Links do rodapé"><a href="#funcionalidades">Funcionalidades</a><a href="#demonstracao">Demonstração</a><Link to="/acessar">Área do cliente</Link><Link to="/SaaS/admin">Gestão SaaS</Link></nav></div><div className="lp-wrap lp-copyright">© {new Date().getFullYear()} Bebfy. Todos os direitos reservados.</div></footer>
  </div>;
}
