import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CheckCircle2, ChevronDown, CreditCard, Layers3, Menu, PackageCheck, Play, ShieldCheck, ShoppingBasket, Sparkles, Truck, Wallet, X, Zap } from 'lucide-react';
import './landing.css';

const features = [
  { icon: ShoppingBasket, title: 'PDV que acompanha o seu ritmo', description: 'Uma frente de caixa ágil para as vendas do dia a dia, com registro e comprovantes internos.' },
  { icon: Boxes, title: 'Estoque sob controle', description: 'Produtos, movimentações, lotes e reposição em um lugar só.' },
  { icon: Wallet, title: 'Caixa e financeiro organizados', description: 'Acompanhe aberturas, fechamento, sangrias e contas da distribuidora.' },
  { icon: CreditCard, title: 'Fiado sem perder o controle', description: 'Histórico de clientes, limite de crédito e valores a receber.' },
  { icon: Truck, title: 'Feito para distribuidoras', description: 'Do balcão à entrega, processos conectados para a sua operação.' },
  { icon: BarChart3, title: 'Decisões com mais clareza', description: 'Indicadores e relatórios para enxergar o movimento do negócio.' },
];

export function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const visual = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(n => n.classList.add('lp-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('lp-visible'); observer.unobserve(e.target); }
    }), { threshold: .12 });
    nodes.forEach(n => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  function moveVisual(e: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = visual.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({ x: ((e.clientX - r.left) / r.width - .5) * 9, y: ((e.clientY - r.top) / r.height - .5) * 9 });
  }

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-container lp-nav-inner">
          <Link className="lp-logo" to="/" aria-label="Bebfy início"><span className="lp-logo-icon"><Layers3 size={23}/></span>bebfy<span className="lp-logo-dot">.</span></Link>
          <nav className={`lp-navigation ${mobileMenu ? 'lp-nav-open' : ''}`} aria-label="Navegação principal">
            <a href="#solucao" onClick={()=>setMobileMenu(false)}>A solução</a>
            <a href="#funcionalidades" onClick={()=>setMobileMenu(false)}>Funcionalidades</a>
            <a href="#como-funciona" onClick={()=>setMobileMenu(false)}>Como funciona</a>
            <a href="#duvidas" onClick={()=>setMobileMenu(false)}>Dúvidas</a>
          </nav>
          <div className="lp-head-right"><Link className="lp-head-login" to="/login">Acessar Bebfy <ArrowRight size={16}/></Link><button className="lp-menu-button" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Abrir ou fechar menu">{mobileMenu?<X/>:<Menu/>}</button></div>
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-hero-glow" aria-hidden="true"/>
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-overline"><span className="lp-dot-green"/> GESTÃO PARA DISTRIBUIDORAS E ADEGAS <Sparkles size={13}/></div>
              <h1>Seu estoque gira.<br/>Suas vendas fluem.<br/><em>Seu negócio evolui.</em></h1>
              <p>Menos planilhas, menos retrabalho e mais controle. Conheça uma forma inteligente de conectar o balcão, o estoque e o financeiro da sua distribuidora.</p>
              <div className="lp-hero-actions"><Link className="lp-action-primary" to="/login">Entrar no Bebfy <ArrowRight size={19}/></Link><a className="lp-action-secondary" href="#solucao"><Play size={17}/> Conhecer a plataforma</a></div>
              <div className="lp-hero-trust"><span><CheckCircle2 size={17}/> Operação integrada</span><span><ShieldCheck size={17}/> Multiempresa</span><span><Zap size={17}/> Simples de usar</span></div>
            </div>
            <div className="lp-hero-visual" ref={visual} onMouseMove={moveVisual} onMouseLeave={()=>setTilt({x:0,y:0})}>
              <div className="lp-hero-photo"><img src="https://unsplash.com/photos/Tnp0T58OmMs/download?force=true&w=1400" alt="Caixas de bebidas empilhadas em um ambiente de distribuição"/><div className="lp-photo-shade"/></div>
              <div className="lp-orbit lp-orbit-1"/><div className="lp-orbit lp-orbit-2"/>
              <div className="lp-screen" style={{ transform:`perspective(1000px) rotateY(${-10+tilt.x}deg) rotateX(${6-tilt.y}deg) rotateZ(-2deg)` }}>
                <aside className="lp-screen-side"><b>b.</b><span className="lp-screen-selected">▦</span><span>◫</span><span>◈</span><span>◉</span></aside>
                <div className="lp-screen-body"><div className="lp-screen-head"><b>Visão geral</b><span className="lp-live">● AO VIVO</span></div><div className="lp-screen-stats"><div><small>Vendas hoje</small><strong>R$ 8.420</strong><span>↗ 12,8%</span></div><div><small>Pedidos</small><strong>142</strong><span>↗ 8,2%</span></div><div><small>Produtos</small><strong>1.284</strong><span>● Em estoque</span></div></div><div className="lp-screen-chart"><div><b>Movimento de vendas</b><small>Últimos 7 dias</small></div><svg viewBox="0 0 390 120" preserveAspectRatio="none" role="img" aria-label="Gráfico ilustrativo de movimentação"><defs><linearGradient id="lpFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#44e8be" stopOpacity=".3"/><stop offset="1" stopColor="#44e8be" stopOpacity="0"/></linearGradient></defs><path d="M0 98 C55 83 62 41 110 65 S177 91 212 52 S282 60 322 27 S359 23 390 14 L390 120 L0 120 Z" fill="url(#lpFill)"/><path d="M0 98 C55 83 62 41 110 65 S177 91 212 52 S282 60 322 27 S359 23 390 14" fill="none" stroke="#4ce8c1" strokeWidth="4" strokeLinecap="round"/></svg><div className="lp-chart-days"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div></div><div className="lp-screen-footer"><span>● Todos os caixas conectados</span><strong>Operação ativa</strong></div></div>
              </div>
              <div className="lp-float lp-float-a"><span><ShoppingBasket size={20}/></span><div><b>Nova venda registrada</b><small>PDV · Agora mesmo</small></div><CheckCircle2 size={17}/></div>
              <div className="lp-float lp-float-b"><span><PackageCheck size={20}/></span><div><b>Estoque atualizado</b><small>Produtos sincronizados</small></div></div>
              <div className="lp-illustrative">PAINEL ILUSTRATIVO · DADOS DEMONSTRATIVOS</div>
            </div>
          </div>
        </section>
        <div className="lp-ticker"><div className="lp-container"><span>UM SISTEMA</span><span>✦</span><span>MAIS CONTROLE</span><span>✦</span><span>MENOS RETRABALHO</span><span>✦</span><span>MAIS RESULTADOS</span></div></div>
        <section className="lp-section lp-about" id="solucao"><div className="lp-container lp-about-grid"><div data-reveal><span className="lp-kicker">FEITO PARA QUEM NÃO PARA</span><h2>Da primeira caixa ao último pedido. <em>É tudo Bebfy.</em></h2><p>A rotina de uma distribuidora não espera. Tenha informações do balcão, do estoque e das contas à mão para que seu tempo seja dedicado ao que realmente importa.</p><a href="#funcionalidades" className="lp-text-link">Explore nossas funcionalidades <ArrowRight size={17}/></a></div><div className="lp-about-image" data-reveal><img loading="lazy" src="https://unsplash.com/photos/hzPeY51pE9U/download?force=true&w=1100" alt="Garrafa de bebida armazenadas em prateleiras"/><span><span className="lp-dot-green"/> Seu negócio em movimento</span></div></div></section>
        <section className="lp-section lp-features-section" id="funcionalidades"><div className="lp-container"><div className="lp-section-intro" data-reveal><span className="lp-kicker">UMA PLATAFORMA, MUITAS POSSIBILIDADES</span><h2>Potência na operação.<br/><em>Simplicidade no dia a dia.</em></h2><p>O essencial de uma distribuidora conectado de ponta a ponta.</p></div><div className="lp-feature-grid">{features.map(({icon:Icon,title,description},index)=><article key={title} className="lp-feature" data-reveal style={{transitionDelay:`${index%3*80}ms`}}><div className="lp-feature-icon"><Icon size={23}/></div><small>0{index+1}</small><h3>{title}</h3><p>{description}</p><span className="lp-feature-bar"/></article>)}</div></div></section>
        <section className="lp-section lp-dark-section"><div className="lp-container lp-dark-grid"><div data-reveal><span className="lp-kicker">MAIS CLAREZA PARA DECIDIR</span><h2>Sua operação no ritmo certo.<br/><em>Seu crescimento também.</em></h2><p>Indicadores que ajudam você a entender o negócio. Do fluxo de caixa à saída de produtos, tudo conectado por uma estrutura pensada para o varejo de bebidas.</p><div className="lp-pills"><span><Zap size={15}/> Agilidade</span><span><ShieldCheck size={15}/> Controle</span><span><Layers3 size={15}/> Escalabilidade</span></div></div><div className="lp-tilt-card" data-reveal><div className="lp-card-heading"><b>RESUMO DA OPERAÇÃO</b><BarChart3 size={20}/></div>{[['Movimento de vendas','83%'],['Estoque organizado','65%'],['Operação de caixa','94%']].map(([label,width])=><div className="lp-tilt-metric" key={label}><div><span>{label}</span><span>● Em movimento</span></div><div className="lp-meter"><i style={{width}}/></div></div>)}<p>Uma visão mais clara do que realmente importa.</p></div></div></section>
        <section className="lp-section" id="como-funciona"><div className="lp-container"><div className="lp-section-intro" data-reveal><span className="lp-kicker">COMECE COM O QUE IMPORTA</span><h2>Simples de começar.<br/><em>Melhor a cada venda.</em></h2></div><div className="lp-steps">{[['01','Organize sua operação','Cadastre sua equipe, produtos e clientes.'],['02','Venda com agilidade','Registre cada venda e acompanhe a movimentação.'],['03','Evolua com informação','Use indicadores para tomar decisões com mais confiança.']].map(([n,title,desc])=><article data-reveal key={n}><span>{n}</span><h3>{title}</h3><p>{desc}</p></article>)}</div></div></section>
        <section className="lp-section lp-faq" id="duvidas"><div className="lp-container lp-faq-grid"><div data-reveal><span className="lp-kicker">DÚVIDAS FREQUENTES</span><h2>Transparência em cada detalhe.</h2><p>Conheça o que a plataforma oferece nesta etapa.</p></div><div data-reveal>{[['O Bebfy funciona para lojas de diferentes tamanhos?','O Bebfy atende operações de bebidas e possui arquitetura multiempresa, com módulos habilitados conforme cada negócio.'],['Posso controlar funcionários e permissões?','Sim. Funcionários e perfis possuem controles de acesso no backend.'],['O sistema emite NF-e ou NFC-e?','Não nesta fase. Os comprovantes são internos e não fiscais; não substituem documentos fiscais oficiais.'],['A distribuidora terá seus próprios dados?','Sim. Os endpoints autenticados são vinculados à empresa e protegidos por verificações multi-tenant.']].map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={19}/></summary><p>{answer}</p></details>)}</div></div></section>
        <section className="lp-cta"><div className="lp-container lp-cta-box" data-reveal><span className="lp-kicker">UM NOVO JEITO DE GERIR BEBIDAS</span><h2>Sua operação pode ir<br/><em>muito mais longe.</em></h2><p>Mais organização para o presente. Mais espaço para crescer.</p><Link to="/login" className="lp-action-light">Acessar o sistema <ArrowRight size={18}/></Link></div></section>
      </main>
      <footer className="lp-footer"><div className="lp-container lp-footer-inner"><div><Link className="lp-logo" to="/"><span className="lp-logo-icon"><Layers3 size={20}/></span>bebfy<span className="lp-logo-dot">.</span></Link><p>Gestão inteligente para quem movimenta o mercado de bebidas.</p></div><nav><a href="#solucao">A plataforma</a><a href="#funcionalidades">Funcionalidades</a><Link to="/login">Área do cliente</Link><Link to="/saas/acesso">Gestão SaaS</Link></nav></div><div className="lp-container lp-legal">© {new Date().getFullYear()} Bebfy. Todos os direitos reservados.</div></footer>
    </div>
  );
}
