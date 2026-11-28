import { useEffect, useState } from 'react';
import { BarChart3, Boxes, Package, ScanLine, ShoppingCart, Wallet } from 'lucide-react';

/** Lightweight layered 3D scene based on the Lovable design, isolated from the tenant app. */
export default function HeroScene() {
  const [pointer, setPointer] = useState({x:0,y:0});
  const [count,setCount]=useState(1);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const timer=window.setInterval(()=>{if(!document.hidden&&!media.matches)setCount(n=>n%4+1);},2400);return()=>window.clearInterval(timer)},[]);
  const items=[['Cerveja lata 350 ml','R$ 4,90'],['Refrigerante 2 L','R$ 9,50'],['Água mineral 500 ml','R$ 2,50'],['Engradado 24 un.','R$ 89,90']];
  const total=items.slice(0,count).reduce((n,[,v])=>n+Number(v.replace('R$ ','').replace(',','.')),0);
  const tilt={transform:`rotateY(${pointer.x*7}deg) rotateX(${pointer.y*-6}deg)`};
  return <div className="lv-scene" onPointerMove={e=>{if(e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const box=e.currentTarget.getBoundingClientRect();setPointer({x:(e.clientX-box.left)/box.width-.5,y:(e.clientY-box.top)/box.height-.5})}} onPointerLeave={()=>setPointer({x:0,y:0})}>
    <div className="lv-scene-glow"/>
    <img className="lv-floating lv-crate lv-original-asset" src="/lovable-landing-assets/crate.webp" width="174" height="147" alt="" aria-hidden="true" decoding="async" />
    <img className="lv-floating lv-boxes lv-original-asset" src="/lovable-landing-assets/boxes.webp" width="127" height="174" alt="" aria-hidden="true" decoding="async" />
    <div className="lv-screen lv-floating" style={tilt}>
      <aside className="lv-screen-sidebar"><span className="lv-screen-logo">b<span>·</span></span>{[ShoppingCart,BarChart3,Package,Boxes,Wallet].map((Icon,i)=><span key={i} className={i===0?'is-active':''}><Icon size={18}/></span>)}</aside>
      <div className="lv-screen-main">
        <div className="lv-screen-head"><strong>Frente de caixa</strong><span><span className="lv-live-dot"/> Caixa 01 aberto</span></div>
        <div className="lv-screen-search"><ScanLine size={16}/> Leia o código de barras…</div>
        <div className="lv-screen-list">{items.slice(0,count).map(([item,price])=><div key={item}><span><Package size={14}/>{item}</span><strong>{price}</strong></div>)}</div>
        <div className="lv-screen-total"><span>Total</span><strong>R$ {total.toFixed(2).replace('.',',')}</strong></div>
        <div className="lv-screen-submit">Finalizar venda</div>
      </div>
    </div>
    <img className="lv-floating lv-scanner lv-original-asset" src="/lovable-landing-assets/scanner.webp" width="116" height="174" alt="Leitor de código de barras ilustrativo" decoding="async" />
  </div>;
}
