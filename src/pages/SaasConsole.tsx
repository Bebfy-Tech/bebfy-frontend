import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Boxes, Building2, Check, CircleAlert, CreditCard, Filter, LayoutDashboard, LockKeyhole, LogOut, Menu, Plus, RefreshCcw, Search, Settings2, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { SaasFuncionarios } from './SaasFuncionarios';
import './saas-premium.css';
import { BebfyBrand } from '../components/BebfyBrand';
import { MODULOS, saasApi } from '../services/saas';
import { saasLoginPath } from '../services/tenantUrls';
import type { CriarEmpresaSaas, EmpresaSaas, PlanoSaas, PlanoEntrada, StatusEmpresa } from '../services/saas';

type Section = 'visao' | 'empresas' | 'planos' | 'modulos' | 'funcionarios';

const statusText: Record<StatusEmpresa,string> = { ATIVA: 'Ativa', EM_TESTE: 'Em teste', SUSPENSA: 'Suspensa', CANCELADA: 'Cancelada' };
const statusStyle: Record<StatusEmpresa,string> = {
  ATIVA: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  EM_TESTE: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  SUSPENSA: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  CANCELADA: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
};
const card = 'saas-card rounded-2xl border border-[#285348] bg-[#0c302a] shadow-[0_15px_45px_rgba(0,0,0,.12)]';
const input = 'saas-field w-full min-h-11 rounded-xl border border-[#396155] bg-[#092a26] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15';
const label = 'block text-xs font-semibold text-emerald-50/75 mb-2';
const money = (v:number) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);
const cleanDigits = (s:string) => s.replace(/\D/g,'');
const maskCpf = (raw: string) => cleanDigits(raw).slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
const maskCnpj = (raw: string) => cleanDigits(raw).slice(0,14).replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
const maskPhone = (raw: string) => {
  const digits=cleanDigits(raw).slice(0,11);
  if(digits.length<3) return digits;
  if(digits.length<=6) return '('+digits.slice(0,2)+') '+digits.slice(2);
  const cut=digits.length>10?7:6;
  return '('+digits.slice(0,2)+') '+digits.slice(2,cut)+'-'+digits.slice(cut);
};
const moneyInput = (raw: string) => cleanDigits(raw).slice(0,11);
const maskMoney = (raw: string) => money(Number(moneyInput(raw))/100);

const errorMessage = (err:unknown) => {
  const e = err as { response?:{data?:{ message?:string|string[]; error?:{ message?:string } };status?:number};message?:string };
  const m=e.response?.data?.message ?? e.response?.data?.error?.message ?? e.message;
  return Array.isArray(m)?m.join(' · '): m || 'Não foi possível concluir a operação.';
};
const blank = (): CriarEmpresaSaas => ({nome:'',documento:'',subdominio:'',email:'',telefone:'',planoId:0,nomeResponsavel:'',cpfResponsavel:'',senhaInicial:''});

function StatusBadge({value}:{value:StatusEmpresa}) { return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle[value]}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{statusText[value]}</span>; }

function StatCard({icon:Icon,label,value,subtitle}:{icon:typeof Activity;label:string;value:string;subtitle:string}) {
  return <div className={`${card} p-5`}><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-slate-400">{label}</span><span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><Icon size={19}/></span></div><strong className="text-3xl font-extrabold tracking-tight">{value}</strong><p className="mt-2 text-xs text-slate-500">{subtitle}</p></div>;
}

export function SaasConsole() {
  const { user, logout } = useSaasAuth();
  const navigate = useNavigate();
  const [section,setSection] = useState<Section>('visao');
  const [empresas,setEmpresas] = useState<EmpresaSaas[]>([]);
  const [planos,setPlanos] = useState<PlanoSaas[]>([]);
  const [selected,setSelected] = useState<EmpresaSaas|null>(null);
  const [filter,setFilter] = useState('');
  const [filterStatus,setFilterStatus] = useState<'TODAS'|StatusEmpresa>('TODAS');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [graceDays,setGraceDays] = useState(7);
  const [graceReason,setGraceReason] = useState('Prorrogação solicitada pelo cliente para regularização do pagamento.');
  const [creating,setCreating] = useState(false);
  const [newCompany,setNewCompany] = useState<CriarEmpresaSaas>(blank());
  const [editPlan,setEditPlan] = useState<number | null>(null);
  const [planModal,setPlanModal] = useState(false);
  const [documentType,setDocumentType] = useState<'CPF'|'CNPJ'>('CNPJ');
  const [moduleEditor,setModuleEditor] = useState<string|null>(null);
  const [moduleSearch,setModuleSearch] = useState('');
  const [companyEdit,setCompanyEdit] = useState(false);
  const [companyForm,setCompanyForm] = useState({nomeFantasia:'',razaoSocial:'',documento:'',telefone:'',nomeResponsavel:'',cpfResponsavel:'',emailResponsavel:'',senhaTemporaria:''});
  const [planData,setPlanData] = useState<PlanoEntrada>({
    nome: '', tipo: 'VAREJO_BASICO', precoMensal: 79, modulosPadrao:[],
  });
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [forbidden,setForbidden] = useState(false);
  const [alert,setAlert] = useState('');
  const [ok,setOk] = useState('');

  const refresh=useCallback(async()=>{
    setLoading(true);setAlert('');
    try {
      const [companies,allPlans]=await Promise.allSettled([saasApi.empresas(),saasApi.planos()]);
      if(companies.status==='fulfilled')setEmpresas(companies.value);
      if(allPlans.status==='fulfilled')setPlanos(allPlans.value);
      setForbidden(companies.status==='rejected' && allPlans.status==='rejected' && !(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('FUNCIONARIOS')||user?.permissoes.includes('MODULOS')));
    } catch (e) {
      const status=(e as {response?:{status?:number}}).response?.status;
      if(status===401||status===403) setForbidden(true);
      else setAlert(errorMessage(e));
    } finally {setLoading(false);}
  },[user?.cargo,user?.permissoes]);

  useEffect(()=>{void refresh();},[refresh]);

  const filtered=useMemo(()=>empresas.filter(e=>{
    const q=filter.toLocaleLowerCase('pt-BR');
    return (filterStatus==='TODAS'||e.status===filterStatus) && [e.nomeFantasia,e.slug,e.subdominio||'',e.cnpj||'',String(e.id)].some(p=>p.toLocaleLowerCase('pt-BR').includes(q));
  }),[empresas,filter,filterStatus]);
  const totalModulos=useMemo(()=>empresas.reduce((v,e)=>v+e.modulosAtivos.filter(m=>m.ativo).length,0),[empresas]);
  const receitaEstimada=useMemo(()=>empresas.filter(e=>e.status==='ATIVA'||e.status==='EM_TESTE').reduce((v,e)=>v+Number(e.plano?.precoMensal||0),0),[empresas]);

  async function openCompany(id:number) {
    setBusy(true);setAlert('');
    try {setSelected(await saasApi.empresa(id));setSection('empresas');setMobileMenu(false);}catch(e){setAlert(errorMessage(e));}
    finally{setBusy(false);}
  }
  async function updateCompany(action:()=>Promise<unknown>, success:string) {
    if(!selected||busy)return;
    setBusy(true);setAlert('');setOk('');
    try {
      await action();
      const [detail,all]=await Promise.all([saasApi.empresa(selected.id),saasApi.empresas()]);
      setSelected(detail);setEmpresas(all);setOk(success);
    }catch(e){setAlert(errorMessage(e));}finally{setBusy(false);}
  }
  async function createCompany(e:React.FormEvent) {
    e.preventDefault();if(busy)return;
    if(!newCompany.planoId){setAlert('Selecione um plano.');return;}
    setBusy(true);setAlert('');setOk('');
    try {
      await saasApi.criarEmpresa({
        ...newCompany,
        documento:cleanDigits(newCompany.documento),
        cpfResponsavel:cleanDigits(newCompany.cpfResponsavel),
        subdominio:newCompany.subdominio.toLowerCase().trim(),
      });
      setCreating(false);setNewCompany(blank());setOk('Distribuidora e proprietário cadastrados com sucesso.');
      setEmpresas(await saasApi.empresas());
    }catch(err){setAlert(errorMessage(err));}finally{setBusy(false);}
  }
  function openPlanEditor(plano?: PlanoSaas) {
    setEditPlan(plano?.id ?? null);
    setPlanData(plano ? {
      nome: plano.nome, tipo: plano.tipo, precoMensal: Number(plano.precoMensal), modulosPadrao:plano.modulosPadrao||[],
    } : { nome: '', tipo: 'VAREJO_BASICO', precoMensal: 79,modulosPadrao:[] });
    setAlert('');
    setPlanModal(true);
  }
  async function savePlan(e:React.FormEvent) {
    e.preventDefault();
    if(busy)return;
    setBusy(true);setAlert('');
    try {
      if(editPlan) await saasApi.editarPlano(editPlan,planData);
      else await saasApi.criarPlano(planData);
      setPlanos(await saasApi.planos());
      setEmpresas(await saasApi.empresas());
      setPlanModal(false);
      setOk(editPlan?'Plano atualizado.':'Novo plano cadastrado.');
    } catch(e) {setAlert(errorMessage(e));}
    finally {setBusy(false);}
  }
  function nav(s:Section){setSection(s);setSelected(null);setCreating(false);setAlert('');setMobileMenu(false);}

  const tabs=([
    {key:'visao',icon:LayoutDashboard,title:'Visão geral',desc:'Indicadores do SaaS'},
    {key:'empresas',icon:Building2,title:'Distribuidoras',desc:'Clientes e acessos'},
    {key:'planos',icon:CreditCard,title:'Planos e assinaturas',desc:'Planos cadastrados'},
    {key:'modulos',icon:Boxes,title:'Módulos da plataforma',desc:'Recursos por empresa'},
    {key:'funcionarios',icon:Users,title:'Funcionários do SaaS',desc:'Equipe e permissões'},
  ] as {key:Section;icon:typeof Activity;title:string;desc:string}[]).filter(tab => {
    if(user?.cargo==='SUPER_ADMIN') return true;
    const necessary:Partial<Record<Section,string>>={
      empresas:'EMPRESAS',planos:'PLANOS',modulos:'MODULOS',funcionarios:'FUNCIONARIOS',
    };
    return tab.key==='visao' || user?.permissoes.includes(necessary[tab.key] || '');
  });

  if(forbidden) return <main className="grid min-h-screen place-items-center bg-[#052b27] px-5 text-center text-white"><div className="max-w-md"><LockKeyhole size={45} className="mx-auto text-rose-300"/><h1 className="mt-5 text-3xl font-extrabold">Acesso restrito</h1><p className="mt-4 leading-relaxed text-slate-400">Esta conta não está autorizada a administrar o SaaS. A autorização é concedida somente pelo servidor.</p><button onClick={()=>{logout();navigate(saasLoginPath,{replace:true});}} className="mt-6 rounded-xl bg-emerald-300 px-6 py-3 font-bold text-[#092d2d]">Voltar ao acesso</button></div></main>;

  return <main className="saas-premium min-h-screen bg-[#061e1e] font-sans text-[#effff9]">
    <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0a0f1d] px-5 py-4">
      <Link to="/" aria-label="Bebfy - início" className="inline-flex items-center"><BebfyBrand light compact /></Link>
      <button type="button" aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenu} aria-controls="saas-main-navigation" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
    </div>
    <aside className={`fixed inset-y-0 left-0 z-40 w-[270px] border-r border-white/[.08] bg-[#0a0f1d] p-5 transition-transform lg:translate-x-0 ${mobileMenu?'translate-x-0':'-translate-x-full'}`}>
      <Link to="/" aria-label="Bebfy - início" className="mb-1 inline-flex items-center px-2"><BebfyBrand light compact /></Link>
      <div className="mb-10 ml-[57px] text-[10px] font-black tracking-[.19em] text-emerald-400">CENTRAL DA PLATAFORMA</div>
      <p className="px-3 text-[10px] font-black tracking-[.2em] text-slate-500">PLATAFORMA</p>
      <nav id="saas-main-navigation" aria-label="Navegação administrativa" className="mt-3 space-y-1.5">
        {tabs.map(t=><button key={t.key} onClick={()=>nav(t.key)} className={`w-full rounded-xl px-3.5 py-3.5 text-left transition ${section===t.key?'bg-emerald-400/15 text-emerald-300':'text-slate-400 hover:bg-white/5 hover:text-white'}`}><span className="flex items-center gap-3 text-sm font-bold"><t.icon size={19}/>{t.title}</span></button>)}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 space-y-4">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-4"><ShieldCheck size={19} className="text-emerald-300"/><p className="mt-2 text-xs font-bold">Acesso administrativo</p><p className="mt-1 text-xs text-slate-500">Protegido pelo backend.</p></div>
        <button onClick={()=>{logout();navigate(saasLoginPath,{replace:true});}} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={18}/> Encerrar sessão</button>
      </div>
    </aside>

    <div className="lg:ml-[270px]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] bg-[#0a0f1d] px-5 py-5 sm:px-9">
        <div><p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Bebfy / Administração da plataforma</p><h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{selected?selected.nomeFantasia:tabs.find(t=>t.key===section)?.title}</h1></div>
        <div className="flex items-center gap-3"><button aria-label="Atualizar dados" onClick={()=>void refresh()} disabled={loading} className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"><RefreshCcw size={18} className={loading?'animate-spin':''}/></button><span className="hidden text-xs font-semibold text-slate-400 sm:block">{user?.nome||'Administrador'}</span><span className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-sm font-bold text-emerald-300">{(user?.nome||'A').slice(0,1).toUpperCase()}</span></div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7 sm:px-9">
        {alert&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{alert}</p>}
        {ok&&<div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><Check size={17}/>{ok}<button className="ml-auto" onClick={()=>setOk('')} aria-label="Fechar aviso"><X size={17}/></button></div>}
        {loading?<div className={`${card} p-12 text-center text-slate-400`}>Carregando dados da plataforma…</div>:<>

          {section==='funcionarios'&&<SaasFuncionarios current={user}/>}
          {section==='visao'&&<>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold tracking-tight">Visão geral da <span className="text-emerald-300">plataforma.</span></h2><p className="mt-1 text-sm text-slate-400">Visão consolidada das distribuidoras cadastradas no Bebfy.</p></div><button onClick={()=>{setSection('empresas');setCreating(true);}} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-extrabold text-[#062116]"><Plus size={18}/> Nova distribuidora</button></div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <StatCard icon={Building2} label="Distribuidoras" value={String(empresas.length)} subtitle="Total cadastradas no SaaS"/>
              <StatCard icon={Activity} label="Ativas" value={String(empresas.filter(e=>e.status==='ATIVA').length)} subtitle="Empresas com status ativo"/>
              <StatCard icon={Users} label="Em teste" value={String(empresas.filter(e=>e.status==='EM_TESTE').length)} subtitle="Contas no período experimental"/>
              <StatCard icon={Wallet} label="Receita potencial / mês" value={money(receitaEstimada)} subtitle="Soma dos preços dos planos, não recebimentos reais"/>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
              <section className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-white/[.07] px-6 py-5"><div><h3 className="font-extrabold">Últimas distribuidoras</h3><p className="mt-1 text-xs text-slate-500">Cadastros recentes da plataforma</p></div><button onClick={()=>nav('empresas')} className="flex items-center gap-1 text-xs font-bold text-emerald-300">Ver todas <ArrowRight size={16}/></button></div>
                <div className="divide-y divide-white/[.06]">{empresas.slice(0,6).map(e=><button key={e.id} onClick={()=>void openCompany(e.id)} className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/[.03]"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/[.07] text-emerald-300"><Building2 size={18}/></span><div className="min-w-0"><strong className="block truncate text-sm">{e.nomeFantasia}</strong><span className="text-xs text-slate-500">{e.slug}</span></div></div><StatusBadge value={e.status}/></button>)}{!empresas.length&&<p className="px-6 py-12 text-center text-sm text-slate-500">Nenhuma distribuidora cadastrada.</p>}</div>
              </section>
              <section className={`${card} p-6`}><div className="mb-6 flex items-center justify-between"><h3 className="font-extrabold">Panorama operacional</h3><BarChart3 size={20} className="text-emerald-300"/></div>
                {[['Ativas',empresas.filter(e=>e.status==='ATIVA').length,'#34d399'],['Em teste',empresas.filter(e=>e.status==='EM_TESTE').length,'#fbbf24'],['Suspensas',empresas.filter(e=>e.status==='SUSPENSA').length,'#fb7185'],['Canceladas',empresas.filter(e=>e.status==='CANCELADA').length,'#64748b']].map(([title,count,color])=><div className="mb-5" key={String(title)}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{title}</span><b>{count}</b></div><div className="h-2 overflow-hidden rounded-full bg-[#07090d]"><div className="h-full rounded-full" style={{width:`${empresas.length?Number(count)/empresas.length*100:0}%`,background:String(color)}}/></div></div>)}
                <div className="mt-7 rounded-xl bg-emerald-400/[.07] p-4"><p className="text-xs font-bold text-emerald-300">{totalModulos} módulos habilitados</p><p className="mt-2 text-xs text-slate-400">Soma das ativações configuradas em todas as empresas.</p></div>
              </section>
            </div>
          </>}

          {section==='empresas'&&!selected&&<>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Gerenciar distribuidoras</h2><p className="mt-1 text-sm text-slate-400">Cadastre lojas, altere planos e configure recursos individuais.</p></div><button onClick={()=>setCreating(true)} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-extrabold text-[#062116]"><Plus size={18}/> Adicionar empresa</button></div>
            <div className={`${card} p-4`}><div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 text-slate-500" size={18}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Pesquisar nome, CNPJ, slug ou ID..." className={`${input} pl-10`}/></div><div className="relative"><Filter size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-500"/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as typeof filterStatus)} className={`${input} min-w-[160px] pl-9`}><option value="TODAS">Todos os status</option>{(Object.keys(statusText) as StatusEmpresa[]).map(st=><option key={st} value={st}>{statusText[st]}</option>)}</select></div></div></div>
            <section className={`${card} overflow-x-auto`}><table className="min-w-[690px] w-full text-left"><thead className="bg-[#131c2c] text-xs text-slate-400"><tr><th className="px-5 py-4">EMPRESA</th><th className="px-5 py-4">STATUS</th><th className="px-5 py-4">PLANO</th><th className="px-5 py-4">PRODUTOS</th><th className="px-5 py-4">CRIADA EM</th><th className="px-5 py-4">AÇÃO</th></tr></thead><tbody className="divide-y divide-white/[.06]">{filtered.map(e=><tr key={e.id} className="hover:bg-white/[.025]"><td className="px-5 py-4"><strong className="block text-sm">{e.nomeFantasia}</strong><small className="text-slate-500">{e.slug} · #{e.id}</small>{e.inadimplente&&<span className="mt-1 block text-xs font-bold text-amber-300">{e.liberacaoFinanceiraAte&&new Date(e.liberacaoFinanceiraAte).getTime()>Date.now()?`Inadimplente · cortesia até ${new Date(e.liberacaoFinanceiraAte).toLocaleDateString('pt-BR')}`:'Inadimplente · acesso bloqueado'}</span>}</td><td className="px-5 py-4"><StatusBadge value={e.status}/></td><td className="px-5 py-4 text-sm text-slate-300">{e.plano?.nome||'Sem plano'}</td><td className="px-5 py-4 text-sm">{e._count.produtos}</td><td className="px-5 py-4 text-xs text-slate-400">{new Date(e.criadoEm).toLocaleDateString('pt-BR')}</td><td className="px-5 py-4"><button onClick={()=>void openCompany(e.id)} className="flex items-center gap-1 text-sm font-bold text-emerald-300">Gerenciar <ArrowRight size={15}/></button></td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="p-12 text-center text-sm text-slate-500">Nenhuma distribuidora encontrada.</td></tr>}</tbody></table></section>
          </>}

          {section==='empresas'&&selected&&<>
            <button onClick={()=>setSelected(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={17}/> Voltar às empresas</button>
            <div className={`${card} p-6`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Building2 size={26}/></span><div><h2 className="text-xl font-extrabold">{selected.nomeFantasia}</h2><p className="mt-1 text-xs text-slate-400">#{selected.id} · {selected.subdominio||selected.slug} · {selected.cnpj||'CNPJ não cadastrado'}</p></div></div><StatusBadge value={selected.status}/></div>
              <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-3"><div><span className="text-slate-500">Funcionários</span><strong className="mt-1 block text-xl">{selected._count.funcionarios}</strong></div><div><span className="text-slate-500">Produtos</span><strong className="mt-1 block text-xl">{selected._count.produtos}</strong></div><div><span className="text-slate-500">Vendas</span><strong className="mt-1 block text-xl">{selected._count.vendas}</strong></div></div>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className={`${card} p-6`}><h3 className="mb-1 font-extrabold">Situação da conta</h3><p className="mb-6 text-xs text-slate-500">Atualiza imediatamente o estado da distribuidora.</p><label className={label}>Status atual</label><select value={selected.status} onChange={e=>{const status=e.target.value as StatusEmpresa;if(status==='SUSPENSA'||status==='CANCELADA'){if(!window.confirm('A empresa perderá acesso ao sistema. Confirmar alteração?'))return;}void updateCompany(()=>saasApi.alterarStatus(selected.id,status),'Status atualizado com sucesso.');}} disabled={busy} className={input}>{(Object.keys(statusText) as StatusEmpresa[]).map(st=><option key={st} value={st}>{statusText[st]}</option>)}</select><p className="mt-4 text-xs text-amber-300">Suspender ou cancelar bloqueia o acesso dos usuários desta empresa.</p></section>
              <section className={`${card} p-6`}><h3 className="mb-1 font-extrabold">Plano de assinatura</h3><p className="mb-6 text-xs text-slate-500">Vincula a empresa a um plano existente no backend.</p><label className={label}>Plano atual</label><select value={selected.planoId??''} onChange={e=>{const planoId=Number(e.target.value);if(planoId)void updateCompany(()=>saasApi.alterarPlano(selected.id,planoId),'Plano atualizado com sucesso.');}} disabled={busy||!planos.length} className={input}><option value="">Sem plano</option>{planos.map(p=><option key={p.id} value={p.id}>{p.nome} — {money(Number(p.precoMensal))}/mês</option>)}</select><p className="mt-4 text-xs text-slate-400">A cobrança financeira recorrente não é executada por esta tela.</p></section>
            </div>
            <section className={`${card} border border-blue-400/20 p-6`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-lg font-extrabold">Financeiro da assinatura · Acesso</h3><p className="mt-1 text-xs text-slate-400">Controle manual de inadimplência e prazo de cortesia. Boletos automáticos ainda não integrados.</p></div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${selected.inadimplente?'bg-amber-400/10 text-amber-200':'bg-emerald-400/10 text-emerald-200'}`}>{selected.inadimplente?'Inadimplente':'Sem bloqueio financeiro'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#09121e] p-4">
                <div><strong className="text-sm">Marcar inadimplência</strong><p className="mt-1 text-xs text-slate-400">Pagamento confirmado? Desmarque para remover o bloqueio financeiro.</p></div>
                <button type="button" role="switch" aria-label="Marcar inadimplência" aria-checked={selected.inadimplente} disabled={busy||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('EMPRESAS'))} onClick={()=>void updateCompany(()=>saasApi.definirInadimplencia(selected.id,!selected.inadimplente),selected.inadimplente?'Restrição financeira removida.':'Empresa marcada como inadimplente.')} className={`relative h-7 w-12 rounded-full ${selected.inadimplente?'bg-amber-400':'bg-slate-600'} disabled:opacity-40`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white ${selected.inadimplente?'left-6':'left-1'}`}/></button>
              </div>
              {selected.inadimplente&&<div className="mt-5 space-y-4">
                <p className="text-sm text-amber-200">{selected.liberacaoFinanceiraAte&&new Date(selected.liberacaoFinanceiraAte).getTime()>Date.now()?'Acesso liberado até '+new Date(selected.liberacaoFinanceiraAte).toLocaleString('pt-BR'):'Acesso bloqueado por inadimplência (salvo bloqueio administrativo adicional).'}</p>
                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <label className="text-xs font-semibold text-slate-400">Liberar por quantos dias?<select className={`${input} mt-2`} value={graceDays} onChange={e=>setGraceDays(Number(e.target.value))}>{[3,7,15,30,60,90].map(d=><option key={d} value={d}>{d} dias</option>)}</select></label>
                  <label className="text-xs font-semibold text-slate-400">Justificativa<textarea className={`${input} mt-2`} rows={2} minLength={8} maxLength={500} value={graceReason} onChange={e=>setGraceReason(e.target.value)}/></label>
                </div>
                <button disabled={busy||graceReason.trim().length<8||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('EMPRESAS'))||!['ATIVA','EM_TESTE'].includes(selected.status)} onClick={()=>void updateCompany(()=>saasApi.liberarTemporariamente(selected.id,graceDays,graceReason),'Acesso liberado por '+graceDays+' dias.')} className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40"><LockKeyhole size={16} className="mr-2 inline"/> Liberar temporariamente</button>
                <p className="text-xs text-slate-400">A dívida permanece pendente. Após o prazo, o bloqueio retorna automaticamente. A suspensão administrativa nunca é ignorada.</p>
              </div>}
              {!!selected.historicoLiberacoes?.length&&<div className="mt-6 border-t border-white/10 pt-5"><h4 className="mb-3 text-sm font-bold">Histórico de liberações</h4><div className="space-y-2">{selected.historicoLiberacoes.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#09121e] p-3 text-xs"><span>{item.dias} dias · {item.motivo}</span><span className="text-slate-400">{new Date(item.criadoEm).toLocaleString('pt-BR')} · até {new Date(item.liberadoAte).toLocaleDateString('pt-BR')}</span></div>)}</div></div>}
            </section>
            <section className={`${card} p-6`}><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">Módulos disponíveis</h3><p className="mt-1 text-xs text-slate-500">Ative ou desative as funcionalidades atribuídas a esta empresa.</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">{selected.modulosAtivos.filter(m=>m.ativo).length} ativados explicitamente</span></div>
              <div className="grid gap-3 md:grid-cols-2">{MODULOS.map(m=>{const configuracao=selected.modulosAtivos.find(x=>x.modulo===m.key);
                const enabled=configuracao?.ativo!==false;return <div key={m.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-[#101829] p-4"><div className="min-w-0"><strong className="text-sm">{m.nome}</strong><p className="mt-1 text-xs text-slate-500">{m.descricao}</p>{!configuracao&&<p className="mt-1 text-[10px] text-amber-300">Padrão legado: permitido quando implementado</p>}</div><button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled?'Desativar':'Ativar'} ${m.nome}`} disabled={busy} onClick={()=>void updateCompany(()=>saasApi.alternarModulo(selected.id,m.key,!enabled),`Módulo ${m.nome} atualizado.`)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${enabled?'bg-emerald-400':'bg-slate-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled?'left-6':'left-1'}`}/></button></div>})}</div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-amber-200/80"><CircleAlert size={16} className="shrink-0"/> Estes controles registram as atribuições de módulos. O bloqueio efetivo de cada funcionalidade nas rotas operacionais deve ser validado no backend antes de comercializar planos por módulo.</p>
            </section>
          </>}

          {section==='planos'&&<>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Planos cadastrados</h2><p className="mt-1 text-sm text-slate-400">Crie e atualize planos e vincule-os às distribuidoras.</p></div><button onClick={()=>openPlanEditor()} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-extrabold text-[#062116]"><Plus size={18}/> Novo plano</button></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{planos.map(p=><div key={p.id} className={`${card} p-6 transition hover:border-emerald-400/30`} onClick={()=>openPlanEditor(p)} onKeyDown={e=>{if(e.key==='Enter')openPlanEditor(p);}} tabIndex={0} role="button" aria-label={"Editar plano "+p.nome}><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><CreditCard size={23}/></span><span className="text-xs font-bold text-slate-500">ID #{p.id}</span></div><h3 className="mt-7 text-lg font-extrabold">{p.nome}</h3><p className="mt-1 text-xs text-slate-500">{p.tipo.replaceAll('_',' ')}</p><div className="mt-5 border-t border-white/10 pt-5"><strong className="text-3xl font-extrabold">{money(Number(p.precoMensal))}</strong><span className="ml-2 text-xs text-slate-400">/ mês</span></div><p className="mt-3 text-xs text-slate-400">{empresas.filter(e=>e.planoId===p.id).length} empresa(s) vinculada(s)</p><button onClick={e=>{e.stopPropagation();openPlanEditor(p);}} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10"><Settings2 size={16}/> Editar plano</button></div>)}{!planos.length&&<div className={`${card} p-8 text-sm text-slate-400`}>Nenhum plano cadastrado. Crie o primeiro para cadastrar distribuidoras.</div>}</div>
          </>}

          {section==='modulos'&&<>
            <div><h2 className="text-xl font-extrabold">Catálogo de módulos</h2><p className="mt-1 text-sm text-slate-400">Módulos previstos no schema do Bebfy e suas ativações por distribuidora.</p></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{MODULOS.map(m=><div key={m.key} className={`${card} p-5`}><div className="flex items-center justify-between"><span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300"><Settings2 size={20}/></span><span className="text-xs font-bold text-emerald-300">{empresas.filter(e=>e.modulosAtivos.some(a=>a.modulo===m.key&&a.ativo)).length} empresas</span></div><h3 className="mt-5 font-extrabold">{m.nome}</h3><p className="mt-2 min-h-9 text-xs leading-relaxed text-slate-500">{m.descricao}</p><button onClick={()=>nav('empresas')} className="mt-5 flex items-center gap-2 border-t border-white/[.08] pt-4 text-xs font-bold text-emerald-300">Gerenciar por empresa <ArrowRight size={15}/></button></div>)}</div>
          </>}

        </>}
      </div>
    </div>


    {planModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Formulário de plano"><form onSubmit={e=>void savePlan(e)} className="max-h-[94dvh] w-full max-w-[710px] space-y-5 overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1d] p-7 shadow-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Planos SaaS</p><h2 className="mt-1 text-2xl font-extrabold">{editPlan?'Editar plano':'Novo plano'}</h2></div><button type="button" onClick={()=>setPlanModal(false)} aria-label="Fechar"><X size={22}/></button></div>
      {alert&&<p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{alert}</p>}
      <div><label htmlFor="plano-nome" className={label}>Nome do plano</label><input id="plano-nome" required minLength={2} maxLength={120} className={input} value={planData.nome} onChange={e=>setPlanData(p=>({...p,nome:e.target.value}))} placeholder="Bebfy Pro"/></div>
      <div><label htmlFor="plano-tipo" className={label}>Tipo</label><select id="plano-tipo" className={input} value={planData.tipo} onChange={e=>setPlanData(p=>({...p,tipo:e.target.value as PlanoEntrada['tipo']}))}><option value="VAREJO_BASICO">Varejo básico</option><option value="VAREJO_PRO">Varejo Pro</option><option value="ATACADO_FULL">Atacado Full</option><option value="PERSONALIZADO">Personalizado</option></select></div>
      <div><label htmlFor="plano-preco" className={label}>Mensalidade (R$)</label><input id="plano-preco" className={input} required inputMode="numeric" value={money(planData.precoMensal)} onChange={e=>setPlanData(p=>({...p,precoMensal:Number(moneyInput(e.target.value))/100}))} aria-describedby="plano-price-hint"/><p id="plano-price-hint" className="mt-1 text-xs text-slate-400">Digite os centavos. Exemplo: 7990 corresponde a R$ 79,90.</p></div>
      <div className="space-y-3 rounded-xl border border-white/10 p-4">
        <div><h3 className="text-sm font-extrabold">Módulos incluídos no plano</h3><p className="mt-1 text-xs text-slate-400">Ao cadastrar uma distribuidora com este plano, os módulos selecionados serão habilitados automaticamente.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{MODULOS.map(m=><label key={m.key} className="flex cursor-pointer items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={(planData.modulosPadrao||[]).includes(m.key)} onChange={e=>setPlanData(p=>({...p,modulosPadrao:e.target.checked?[...(p.modulosPadrao||[]),m.key]:(p.modulosPadrao||[]).filter(k=>k!==m.key)}))}/>{m.nome}</label>)}</div>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">O cadastro altera o catálogo de planos. Cobranças automáticas não são processadas neste módulo.</p>
      <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setPlanModal(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-[#062116] disabled:opacity-50">{busy?'Salvando…':'Salvar plano'}</button></div>
    </form></div>}
    {creating&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cadastrar distribuidora"><div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1d] p-5 shadow-2xl sm:p-8"><div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Novo cliente SaaS</p><h2 className="mt-1 text-2xl font-extrabold">Cadastrar distribuidora</h2></div><button onClick={()=>setCreating(false)} aria-label="Fechar" className="rounded-xl bg-white/5 p-2"><X size={21}/></button></div>
      {alert&&<p role="alert" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{alert}</p>}
      <form onSubmit={e=>void createCompany(e)} className="space-y-5">
        <p className="border-b border-white/10 pb-2 text-sm font-extrabold">Dados da empresa</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="empresa-nome" className={label}>Nome da distribuidora</label><input id="empresa-nome" className={input} required value={newCompany.nome} onChange={e=>setNewCompany(p=>({...p,nome:e.target.value}))} placeholder="Ex.: Adega Central"/></div>
          <div><label htmlFor="empresa-cnpj" className={label}>CNPJ (14 dígitos)</label><input id="empresa-cnpj" className={input} required inputMode="numeric" minLength={14} maxLength={18} value={newCompany.documento} onChange={e=>setNewCompany(p=>({...p,documento:e.target.value}))} placeholder="00000000000000"/></div>
          <div><label htmlFor="empresa-slug" className={label}>Slug / subdomínio</label><input id="empresa-slug" className={input} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={newCompany.subdominio} onChange={e=>setNewCompany(p=>({...p,subdominio:e.target.value.toLowerCase()}))} placeholder="adega-central"/></div>
          <div><label htmlFor="empresa-telefone" className={label}>Telefone comercial</label><input id="empresa-telefone" className={input} required value={newCompany.telefone} onChange={e=>setNewCompany(p=>({...p,telefone:e.target.value}))} placeholder="(11) 99999-9999"/></div>
          <div className="sm:col-span-2"><label htmlFor="empresa-plano" className={label}>Plano inicial</label><select id="empresa-plano" className={input} required value={newCompany.planoId||''} onChange={e=>setNewCompany(p=>({...p,planoId:Number(e.target.value)}))}><option value="">Selecione um plano</option>{planos.map(p=><option key={p.id} value={p.id}>{p.nome} — {money(Number(p.precoMensal))}/mês</option>)}</select></div>
        </div>
        <p className="border-b border-white/10 pb-2 pt-2 text-sm font-extrabold">Responsável e acesso inicial</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="responsavel" className={label}>Nome do proprietário</label><input id="responsavel" className={input} required value={newCompany.nomeResponsavel} onChange={e=>setNewCompany(p=>({...p,nomeResponsavel:e.target.value}))}/></div>
          <div><label htmlFor="cpf" className={label}>CPF (11 dígitos)</label><input id="cpf" className={input} required inputMode="numeric" value={newCompany.cpfResponsavel} onChange={e=>setNewCompany(p=>({...p,cpfResponsavel:e.target.value}))}/></div>
          <div><label htmlFor="email" className={label}>E-mail do responsável</label><input id="email" type="email" className={input} required autoComplete="off" value={newCompany.email} onChange={e=>setNewCompany(p=>({...p,email:e.target.value}))}/></div>
          <div><label htmlFor="senha-inicial" className={label}>Senha inicial (mínimo 10 caracteres)</label><input id="senha-inicial" type="password" minLength={10} className={input} required autoComplete="new-password" value={newCompany.senhaInicial} onChange={e=>setNewCompany(p=>({...p,senhaInicial:e.target.value}))}/></div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">A empresa será criada no status “Em teste”, com um proprietário inicial e código de operador 1. Oriente o responsável a trocar sua senha após o primeiro acesso.</p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={()=>setCreating(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold">Cancelar</button><button disabled={busy||!planos.length} type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-[#062116] disabled:opacity-50">{busy?'Salvando…':'Criar distribuidora'} <Check size={17}/></button></div>
      </form></div></div>}
  </main>;
}
