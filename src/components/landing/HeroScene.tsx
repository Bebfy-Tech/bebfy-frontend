import { useEffect, useState } from 'react';
import { BarChart3, Boxes, CreditCard, Package, ScanLine, ShoppingCart, Wallet } from 'lucide-react';

/** Lightweight layered 3D scene based on the Lovable design, isolated from the tenant app. */
export default function HeroScene() {
  const [pointer, setPointer] = useState({x:0,y:0});
  const [count,setCount]=useState(1);
  useEffect(()=>{const timer=window.setInterval(()=>setCount(n=>n%4+1),2400);return()=>window.clearInterval(timer)},[]);
  const items=[['Cerveja lata 350 ml','R$ 4,90'],['Refrigerante 2 L','R$ 9,50'],['Água mineral 500 ml','R$ 2,50'],['Engradado 24 un.','R$ 89,90']];
  const total=items.slice(0,count).reduce((n,[,v])=>n+Number(v.replace('R$ ','').replace(',','.')),0);
  const tilt={transform:`rotateY(${pointer.x*7}deg) rotateX(${pointer.y*-6}deg)`};
  return <div className="lv-scene" onPointerMove={e=>{const box=e.currentTarget.getBoundingClientRect();setPointer({x:(e.clientX-box.left)/box.width-.5,y:(e.clientY-box.top)/box.height-.5})}} onPointerLeave={()=>setPointer({x:0,y:0})}>
    <div className="lv-scene-glow"/>
    <div className="lv-floating lv-crate" aria-hidden="true"><div className="lv-crate-side"/><div className="lv-crate-body"><div/><div/><div/><div/></div></div>
    <div className="lv-floating lv-boxes" aria-hidden="true"><div className="lv-box lv-box-a"/><div className="lv-box lv-box-b"/><div className="lv-box lv-box-c"/></div>
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
    <div className="lv-floating lv-scanner" aria-label="Leitor de código de barras ilustrativo"><div className="lv-scanner-head"><div className="lv-scanner-lens"><ScanLine size={45}/><span/></div></div><div className="lv-scanner-handle"/></div>
  </div>;
}
