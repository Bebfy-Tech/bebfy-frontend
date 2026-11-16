import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BarChart3, Boxes, Building2, CheckCircle2, ChevronDown, FileUp, Menu, Package, ShieldCheck, ShoppingCart, Sparkles, Users, Wallet, X } from 'lucide-react';
import HeroScene from '../components/landing/HeroScene';
import './lovable-landing.css';

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
  dashboard: {label:'Visão geral',icon:BarChart3,title:'Enxergue o movimento do negócio.',description:'Indicadores do dia, produtos mais vendidos e atalhos para a operação.',rows:[['Vendas do dia','142'],['Caixas em operação','2'],['Ticket médio','R$ 59,30']]},
  pdv: {label:'PDV',icon:ShoppingCart,title:'Mais agilidade na hora de vender.',description:'Busca rápida de produtos, carrinho, formas de pagamento e comprovante não fiscal.',rows:[['Produto adicionado','Cerveja 350 ml'],['Quantidade','2 unidades'],['Total ilustrativo','R$ 9,80']]},
  estoque: {label:'Estoque',icon:Boxes,title:'Clareza sobre cada produto.',description:'Acompanhe quantidades, lotes, validade e entradas sem planilhas espalhadas.',rows:[['Produtos cadastrados','1.284'],['Movimentação','Entrada de estoque'],['Origem','Manual / XML']]},
} as const;
type Preview = keyof typeof previews;
const questions = [
  ['Para quais negócios o Bebfy foi pensado?','Distribuidoras, adegas, empórios e atacados de bebidas que precisam organizar vendas e operações.'],
  ['Posso controlar funcionários e permissões?','Sim. O Bebfy oferece gestão de funcionários com permissões por perfil.'],
  ['O Bebfy emite notas fiscais?','Nesta fase, não há emissão de NF-e nem NFC-e. É possível importar arquivos XML de NF-e manualmente.'],
  ['O sistema confirma pagamentos automaticamente?','Não. Pix e cartão são registrados manualmente, sem integração automática com bancos.'],
  ['Como entro na minha distribuidora?','Clique em Já sou cliente, informe o endereço da sua distribuidora e depois entre com seu código e senha.'],
];
const navigation = [['#funcionalidades','Funcionalidades'],['#demonstracao','Demonstração'],['#como-funciona','Como funciona'],['#duvidas','Dúvidas']];
function Reveal({children,className=''}:{children:ReactNode,className?:string}) { return <div className={`lv-reveal ${className}`}>{children}</div>; }
function Brand(){ return <Link to="/" className="lv-brand" aria-label="Bebfy, página inicial"><img src="/bebfy-symbol.svg" alt="" aria-hidden="true"/><span>bebfy<b>.</b></span></Link>; }
function DashboardPreview() {
  return <div className="lv-preview-screen" aria-label="Prévia ilustrativa do painel Bebfy">
    <div className="lv-preview-header"><strong>Visão geral</strong><span>Últimos 30 dias</span></div>
    <div className="lv-preview-stats">
      {[['Faturamento','R$ 24.780'],['Vendas','412'],['Clientes','186']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}
    </div>
    <svg viewBox="0 0 450 140" preserveAspectRatio="none" className="lv-preview-chart" role="img" aria-label="Gráfico ilustrativo de crescimento">
      <defs><linearGradient id="lv-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62e5ad" stopOpacity=".4"/><stop offset="1" stopColor="#62e5ad" stopOpacity="0"/></linearGradient></defs>
      <path d="M0 128 L35 107 L70 115 L110 79 L150 91 L190 55 L228 67 L267 33 L302 49 L345 15 L385 28 L425 6 L450 14 L450 140 L0 140Z" fill="url(#lv-grad)"/>
      <path d="M0 128 L35 107 L70 115 L110 79 L150 91 L190 55 L228 67 L267 33 L302 49 L345 15 L385 28 L425 6 L450 14" fill="none" stroke="#62e5ad" strokeWidth="3.5" strokeLinejoin="round"/>
    </svg>
    <span className="lv-demo-disclaimer">Dados ilustrativos</span>
  </div>;
}
export function LandingPage() {
  const [menuOpen,setMenuOpen]=useState(false);
  const [preview,setPreview]=useState<Preview>('dashboard');
  const active=previews[preview];
  useEffect(()=>{const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('lv-revealed');observer.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.lv-reveal').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[]);
  return <div className="lv-landing">
    <header className="lv-navbar-wrap">
      <div className="lv-navbar">
        <Brand/>
        <nav className="lv-desktop-nav" aria-label="Navegação principal">{navigation.map(([href,label])=><a key={href} href={href}>{label}</a>)}</nav>
        <Link to="/acessar" className="lv-nav-cta">Acessar sistema <ArrowRight size={16}/></Link>
        <button type="button" className="lv-mobile-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label={menuOpen?'Fechar menu':'Abrir menu'} aria-expanded={menuOpen}>{menuOpen?<X/>:<Menu/>}</button>
      </div>
      {menuOpen&&<nav className="lv-mobile-menu" aria-label="Menu móvel">{navigation.map(([href,label])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{label}</a>)}<Link to="/acessar" onClick={()=>setMenuOpen(false)}>Acessar sistema</Link></nav>}
    </header>
    <main>
      <section id="inicio" className="lv-hero">
        <div className="lv-gridlines" aria-hidden="true"/>
        <div className="lv-container lv-hero-grid">
          <div className="lv-hero-copy">
            <div className="lv-eyebrow"><Sparkles size={15}/> Gestão para o mercado de bebidas</div>
            <h1>Sua distribuidora <em>no controle.</em></h1>
            <p>Vendas, estoque, financeiro e equipe em uma plataforma completa, simples e organizada.</p>
            <div className="lv-hero-actions"><a href="#demonstracao" className="lv-button-primary">Ver demonstração <ArrowRight size={19}/></a><Link to="/acessar" className="lv-button-outline">Já sou cliente <ArrowRight size={17}/></Link></div>
            <div className="lv-trust"><span><CheckCircle2 size={16}/> Operação conectada</span><span><ShieldCheck size={16}/> Acesso por distribuidora</span></div>
          </div>
          <div className="lv-hero-art">
            <HeroScene/>
            <div className="lv-float-badge lv-badge-sale"><small>Venda finalizada</small><strong>+ R$ 14,90</strong></div>
            <div className="lv-float-badge lv-badge-stock"><small>Estoque</small><strong>1.284 itens</strong></div>
            <span className="lv-illustration-label">Demonstração ilustrativa · Dados fictícios</span>
          </div>
        </div>
      </section>
      <div className="lv-marquee" aria-label="Bebfy para distribuidoras, adegas, empórios, atacados e depósitos de bebidas"><div>{[0,1].map(k=><span key={k}>Distribuidoras <b>✦</b> Adegas <b>✦</b> Empórios <b>✦</b> Atacados <b>✦</b> Depósitos de bebidas <b>✦</b></span>)}</div></div>
      <section id="funcionalidades" className="lv-section lv-modules-section"><div className="lv-container">
        <Reveal><p className="lv-section-kicker">MÓDULOS DO BEBFY</p><h2>Tudo o que você precisa, <em>em um só lugar.</em></h2></Reveal>
        <div className="lv-module-grid">{modules.map(({icon:Icon,title,description})=><Reveal key={title}><article className="lv-module-card"><span className="lv-module-icon"><Icon size={23}/></span><h3>{title}</h3><p>{description}</p></article></Reveal>)}</div>
      </div></section>
      <section id="demonstracao" className="lv-section lv-demo-section"><div className="lv-gridlines" aria-hidden="true"/><div className="lv-container lv-demo-inner">
        <Reveal className="lv-centered"><p className="lv-section-kicker">CONHEÇA POR DENTRO</p><h2>Uma plataforma para quem está na operação.</h2></Reveal>
        <div className="lv-preview-tabs" role="tablist" aria-label="Prévia de módulos">{(Object.keys(previews) as Preview[]).map(key=>{const Icon=previews[key].icon;return <button type="button" role="tab" aria-selected={preview===key} key={key} className={preview===key?'is-selected':''} onClick={()=>setPreview(key)}><Icon size={17}/>{previews[key].label}</button>})}</div>
        <div className="lv-demo-grid"><div key={preview} className="lv-demo-description"><h3>{active.title}</h3><p>{active.description}</p><div className="lv-demo-rows">{active.rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div><DashboardPreview/></div>
      </div></section>
      <section id="como-funciona" className="lv-section lv-process-section"><div className="lv-container"><Reveal><h2>Em poucos passos, sua operação organizada.</h2></Reveal><div className="lv-steps">{[[Building2,'Configure sua distribuidora','Organize os dados, a equipe e os acessos.'],[Boxes,'Cadastre e controle','Gerencie produtos, preços e estoque.'],[BarChart3,'Venda com clareza','Registre vendas e acompanhe indicadores.']].map(([Icon,title,description],i)=>{const IconComponent=Icon as typeof Boxes;return <Reveal key={title as string}><article><span className="lv-step-number">0{i+1}</span><IconComponent size={31}/><h3>{title as string}</h3><p>{description as string}</p></article></Reveal>})}</div></div></section>
      <section id="duvidas" className="lv-section lv-faq-section"><div className="lv-container lv-faq-grid"><Reveal><p className="lv-section-kicker">DÚVIDAS FREQUENTES</p><h2>O essencial, sem complicação.</h2><p>Veja como o Bebfy atende a rotina do mercado de bebidas.</p></Reveal><div className="lv-faq-list">{questions.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={20}/></summary><p>{answer}</p></details>)}</div></div></section>
      <section className="lv-final-section"><div className="lv-container lv-centered"><p className="lv-section-kicker">SEU NEGÓCIO NO PRÓXIMO NÍVEL</p><h2>Mais organização para o presente. <em>Mais espaço para crescer.</em></h2><p>Descubra como o Bebfy pode simplificar a gestão da sua distribuidora.</p><a className="lv-button-primary" href="#demonstracao">Explorar a demonstração <ArrowUpRight size={18}/></a></div></section>
    </main>
    <footer className="lv-footer"><div className="lv-container lv-footer-main"><div><Brand/><p>Gestão inteligente para quem movimenta o mercado de bebidas.</p></div><nav aria-label="Links do rodapé"><a href="#funcionalidades">Funcionalidades</a><a href="#demonstracao">Demonstração</a><Link to="/acessar">Área do cliente</Link><Link to="/SaaS/admin">Gestão SaaS</Link></nav></div><div className="lv-container lv-footer-bottom">© {new Date().getFullYear()} Bebfy. Todos os direitos reservados.</div></footer>
  </div>;
}
