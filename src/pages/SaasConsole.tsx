import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Boxes, Building2, Check, CircleAlert, CreditCard, LayoutDashboard, LockKeyhole, LogOut, Menu, Plus, RefreshCcw, Settings2, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { SaasFuncionarios } from './SaasFuncionarios';
import { SaasFinanceiro } from './SaasFinanceiro';
import { SaasSuporte } from './SaasSuporte';
import { SaasCompanies, SaasCompanyHistory } from './SaasCompanies';
import { SaasModules } from './SaasModules';
import { SaasPlans } from './SaasPlans';
import { SaasExecutiveOverview } from './SaasExecutiveOverview';
import { SaasMonitoramento } from './SaasMonitoramento';
import { SaasAuditoria } from './SaasAuditoria';
import { SaasProfile } from './SaasProfile';
import './saas-premium.css';
import { BebfyBrand } from '../components/BebfyBrand';
import { MODULOS, saasApi, PENDENTES, DISPONIVEIS, PLANOS_PADRAO, moduloLiberado } from '../services/saas';
import { saasLoginPath } from '../services/tenantUrls';
import type { CriarEmpresaSaas, EmpresaSaas, PlanoSaas, PlanoEntrada, StatusEmpresa, SaasModuloDescricao, SaasCobranca } from '../services/saas';

type Section = 'visao' | 'empresas' | 'financeiro' | 'suporte' | 'monitoramento' | 'auditoria' | 'planos' | 'modulos' | 'funcionarios';


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

const errorMessage = (err:unknown) => {
  const e = err as { response?:{data?:{ message?:string|string[]; error?:{ message?:string } };status?:number};message?:string };
  const m=e.response?.data?.message ?? e.response?.data?.error?.message ?? e.message;
  return Array.isArray(m)?m.join(' · '): m || 'Não foi possível concluir a operação.';
};
const blank = (): CriarEmpresaSaas => ({nome:'',documento:'',subdominio:'',email:'',telefone:'',planoId:0,nomeResponsavel:'',cpfResponsavel:'',senhaInicial:''});

function StatusBadge({value}:{value:StatusEmpresa}) { return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle[value]}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{statusText[value]}</span>; }

export function SaasConsole() {
  const { user, logout } = useSaasAuth();
  const navigate = useNavigate();
  const [section,setSection] = useState<Section>('visao');
  const [empresas,setEmpresas] = useState<EmpresaSaas[]>([]);
  const [empresasDisponiveis,setEmpresasDisponiveis]=useState(false);
  const [planos,setPlanos] = useState<PlanoSaas[]>([]);
  const [planosDisponiveis,setPlanosDisponiveis]=useState(false);
  const [selected,setSelected] = useState<EmpresaSaas|null>(null);
  const [companyTab,setCompanyTab]=useState<'resumo'|'financeiro'|'modulos'|'acessos'|'historico'>('resumo');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [profileOpen,setProfileOpen] = useState(false);
  const [supportCompanyId,setSupportCompanyId] = useState<number|null>(null);
  const [graceDays,setGraceDays] = useState(7);
  const [graceReason,setGraceReason] = useState('Prorrogação solicitada pelo cliente para regularização do pagamento.');
  const [creating,setCreating] = useState(false);
  const [newCompany,setNewCompany] = useState<CriarEmpresaSaas>(blank());
  const [slugCheck,setSlugCheck] = useState<{status:'empty'|'checking'|'available'|'taken'|'error'; sugestoes:string[]}>({status:'empty',sugestoes:[]});
  const normalizedSlug = newCompany.subdominio.trim().toLowerCase();
  useEffect(()=>{
    if (!creating || !normalizedSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug) || normalizedSlug.length>60) {
      setSlugCheck({status:'empty',sugestoes:[]}); return;
    }
    let cancelled=false;
    setSlugCheck({status:'checking',sugestoes:[]});
    const timeout=window.setTimeout(()=>{
      void saasApi.verificarEndereco(normalizedSlug).then(response=>{
        if(!cancelled) setSlugCheck({status:response.disponivel?'available':'taken',sugestoes:response.sugestoes});
      }).catch(()=>{if(!cancelled)setSlugCheck({status:'error',sugestoes:[]});});
    },350);
    return ()=>{cancelled=true;window.clearTimeout(timeout);};
  },[normalizedSlug,creating]);
  const [editPlan,setEditPlan] = useState<number | null>(null);
  const [planModal,setPlanModal] = useState(false);
  const [documentType,setDocumentType] = useState<'CPF'|'CNPJ'>('CNPJ');
  const [modDescriptions,setModDescriptions] = useState<SaasModuloDescricao[]>([]);
  const [companyEdit,setCompanyEdit] = useState(false);
  const [cobrancas,setCobrancas] = useState<SaasCobranca[]>([]);
  const [billingForm,setBillingForm] = useState({referencia:'',valor:0,vencimento:'',linhaDigitavel:'',observacao:''});
  const [billingOpen,setBillingOpen] = useState(false);
  const [companyForm,setCompanyForm] = useState({nomeFantasia:'',razaoSocial:'',documento:'',telefone:'',nomeResponsavel:'',cpfResponsavel:'',emailResponsavel:'',senhaTemporaria:''});
  const [planData,setPlanData] = useState<PlanoEntrada>({
    nome: '', tipo: 'VAREJO_BASICO', precoMensal: 79, modulosPadrao:[...PLANOS_PADRAO.VAREJO_BASICO],
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
      setEmpresasDisponiveis(companies.status==='fulfilled');
      if(companies.status==='fulfilled')setEmpresas(companies.value);else setEmpresas([]);
      setPlanosDisponiveis(allPlans.status==='fulfilled');
      if(allPlans.status==='fulfilled')setPlanos(allPlans.value);else setPlanos([]);
      try {setModDescriptions(await saasApi.descricoesModulos());} catch { /* A role may have no MODULOS permission. */ }
      setForbidden(false); // Individual API permissions govern each section; a failed request is not proof of an invalid session.
    } catch (e) {
      const status=(e as {response?:{status?:number}}).response?.status;
      if(status===401||status===403) setForbidden(true);
      else setAlert(errorMessage(e));
    } finally {setLoading(false);}
  },[user?.cargo,user?.permissoes]);

  useEffect(()=>{void refresh();},[refresh]);

  function exportarResumo() {
    // Neutralize formula injection when viewed in Excel and preserve UTF-8 accents.
    const safe=(value:unknown)=>{
      const raw=String(value??'');
      const escaped=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
      return '"'+escaped.replace(/"/g,'""')+'"';
    };
    const lines=[
      ['Empresa','Identificador','Status','Plano','Mensalidade potencial (R$)','Funcionarios','Produtos','Vendas','Criada em'],
      ...empresas.map(e=>[e.nomeFantasia,e.slug,e.status,e.plano?.nome||'Sem plano',
        Number(e.plano?.precoMensal||0).toFixed(2),e._count.funcionarios,
        e._count.produtos,e._count.vendas,new Date(e.criadoEm).toLocaleDateString('pt-BR')]),
    ];
    const csv='\uFEFF'+lines.map(r=>r.map(safe).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');
    link.href=url;link.download='bebfy-resumo-saas.csv';document.body.appendChild(link);
    link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function openCompany(id:number) {
    if(busy||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('EMPRESAS')))return;
    setBusy(true);setAlert('');
    try {const [empresa,cob]=await Promise.all([saasApi.empresa(id),saasApi.cobrancas(id)]);setSelected(empresa);setCobrancas(cob);setCompanyTab('resumo');setSection('empresas');setMobileMenu(false);}catch(e){setAlert(errorMessage(e));}
    finally{setBusy(false);}
  }
  async function addCobranca(e:React.FormEvent) {
    e.preventDefault();if(!selected||busy)return;
    setBusy(true);setAlert('');
    try {
      await saasApi.criarCobranca(selected.id,{
        ...billingForm,
        vencimento:new Date(billingForm.vencimento+'T12:00:00').toISOString(),
      });
      setCobrancas(await saasApi.cobrancas(selected.id));
      setBillingForm({referencia:'',valor:0,vencimento:'',linhaDigitavel:'',observacao:''});
      setBillingOpen(false);setOk('Cobrança registrada. O pagamento ainda depende de confirmação manual.');
    }catch(err){setAlert(errorMessage(err));}finally{setBusy(false);}
  }
  async function markCobranca(cobranca:SaasCobranca,pago:boolean){
    if(!selected||busy)return;
    if(!window.confirm(pago?'Confirmar que este pagamento foi recebido?':'Remover a confirmação de pagamento?'))return;
    setBusy(true);setAlert('');
    try {
      await saasApi.marcarPagamento(selected.id,cobranca.id,pago);
      setCobrancas(await saasApi.cobrancas(selected.id));
      setOk(pago?'Pagamento registrado manualmente.':'Pagamento desmarcado.');
    }catch(err){setAlert(errorMessage(err));}finally{setBusy(false);}
  }

  function openCompanyEditor() {
    if (!selected) return;
    const owner=selected.funcionarios?.[0];
    setCompanyForm({
      nomeFantasia:selected.nomeFantasia, razaoSocial:selected.razaoSocial||'',
      documento:selected.cnpj ? (selected.cnpj.length===11?maskCpf(selected.cnpj):maskCnpj(selected.cnpj)) : '',
      telefone:maskPhone(selected.config?.telefone||''),nomeResponsavel:owner?.nome||'',
      cpfResponsavel:maskCpf(owner?.cpf||''),emailResponsavel:owner?.usuario?.email||'',
      senhaTemporaria:'',
    });
    setAlert('');setCompanyEdit(true);
  }
  async function saveCompanyDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);setAlert('');
    try {
      await saasApi.editarEmpresa(selected.id,{
        nomeFantasia: companyForm.nomeFantasia.trim(),razaoSocial:companyForm.razaoSocial.trim(),
        documento:cleanDigits(companyForm.documento),telefone:cleanDigits(companyForm.telefone),
        nomeResponsavel:companyForm.nomeResponsavel.trim(),cpfResponsavel:cleanDigits(companyForm.cpfResponsavel),
        emailResponsavel:companyForm.emailResponsavel.trim().toLowerCase(),
        ...(companyForm.senhaTemporaria?{senhaTemporaria:companyForm.senhaTemporaria}:{}),
      });
      const [detail,all]=await Promise.all([saasApi.empresa(selected.id),saasApi.empresas()]);
      setSelected(detail);setEmpresas(all);setCompanyEdit(false);setOk('Dados da distribuidora atualizados.');
    }catch(err){setAlert(errorMessage(err));}
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
    if(slugCheck.status!=='available'){setAlert('Confirme um endereço disponível para a distribuidora.');return;}
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
    if(busy||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('PLANOS')))return;
    setEditPlan(plano?.id ?? null);
    setPlanData(plano ? {
      nome: plano.nome, tipo: plano.tipo, precoMensal: Number(plano.precoMensal), modulosPadrao:(plano.modulosPadrao||[]).filter(m=>!PENDENTES.includes(m)),
    } : { nome: '', tipo: 'VAREJO_BASICO', precoMensal: 79,modulosPadrao:[...PLANOS_PADRAO.VAREJO_BASICO] });
    setAlert('');
    setPlanModal(true);
  }
  async function savePlan(e:React.FormEvent) {
    e.preventDefault();
    if(busy||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('PLANOS')))return;
    const nome=planData.nome.trim();
    if(nome.length<2||!Number.isFinite(planData.precoMensal)||planData.precoMensal<=0||planData.precoMensal>99999999.99){setAlert('Informe um nome válido e uma mensalidade positiva de até R$ 99.999.999,99.');return;}
    const dados={...planData,nome,modulosPadrao:[...new Set(planData.modulosPadrao||[])].filter(m=>!PENDENTES.includes(m))};
    if(editPlan!==null){
      const original=planos.find(p=>p.id===editPlan);
      const alterouPreco=Number(original?.precoMensal)!==dados.precoMensal;
      const alterouModulos=JSON.stringify([...(original?.modulosPadrao||[])].sort())!==JSON.stringify([...dados.modulosPadrao].sort());
      if(alterouPreco||alterouModulos){
        const total=original?.resumo?.total;
        const aviso=['Este plano '+(total===undefined?'pode ter empresas vinculadas.': 'possui '+total+' empresa(s) vinculada(s).'),alterouPreco?'O novo preço será utilizado nas próximas mensalidades geradas; cobranças anteriores serão preservadas.':'',alterouModulos?'A alteração dos módulos padrão afeta os acessos herdados do plano, preservando as exceções manuais.':'','Confirma salvar as alterações?'].filter(Boolean).join('\n\n');
        if(!window.confirm(aviso))return;
      }
    }
    setBusy(true);setAlert('');setOk('');
    try {
      if(editPlan!==null) await saasApi.editarPlano(editPlan,dados);
      else await saasApi.criarPlano(dados);
      setPlanModal(false);
      setOk(editPlan!==null?'Plano atualizado.':'Novo plano cadastrado.');
      const [p,c]=await Promise.allSettled([saasApi.planos(),saasApi.empresas()]);
      setPlanosDisponiveis(p.status==='fulfilled');
      if(p.status==='fulfilled')setPlanos(p.value);else{setPlanos([]);setAlert('Plano salvo, mas não foi possível atualizar o catálogo. Utilize Atualizar dados.');}
      setEmpresasDisponiveis(c.status==='fulfilled');if(c.status==='fulfilled')setEmpresas(c.value);else setEmpresas([]);
    } catch(e) {setAlert(errorMessage(e));}
    finally {setBusy(false);}
  }
  function nav(s:Section){setSection(s);setSelected(null);setCreating(false);setAlert('');setMobileMenu(false);setSupportCompanyId(null);}

  const tabs=([
    {key:'visao',icon:LayoutDashboard,title:'Visão geral',desc:'Indicadores do SaaS'},
    {key:'empresas',icon:Building2,title:'Distribuidoras',desc:'Clientes e acessos'},
    {key:'financeiro',icon:Wallet,title:'Financeiro e cobranças',desc:'Recebimentos e bloqueios'},
    {key:'suporte',icon:Activity,title:'Central de suporte',desc:'Ordens e atendimento pelo WhatsApp'},
    {key:'monitoramento',icon:BarChart3,title:'Monitoramento',desc:'Atividade e uso dos clientes'},
    {key:'auditoria',icon:ShieldCheck,title:'Auditoria',desc:'Histórico administrativo'},
    {key:'planos',icon:CreditCard,title:'Planos e assinaturas',desc:'Planos cadastrados'},
    {key:'modulos',icon:Boxes,title:'Módulos da plataforma',desc:'Recursos por empresa'},
    {key:'funcionarios',icon:Users,title:'Funcionários do SaaS',desc:'Equipe e permissões'},
  ] as {key:Section;icon:typeof Activity;title:string;desc:string}[]).filter(tab => {
    if(user?.cargo==='SUPER_ADMIN') return true;
    const necessary:Partial<Record<Section,string>>={
      empresas:'EMPRESAS',financeiro:'EMPRESAS',suporte:'SUPORTE',monitoramento:'EMPRESAS',auditoria:'FUNCIONARIOS',planos:'PLANOS',modulos:'MODULOS',funcionarios:'FUNCIONARIOS',
    };
    return tab.key==='visao' || user?.permissoes.includes(necessary[tab.key] || '');
  });

  if(forbidden) return <main className="grid min-h-screen place-items-center bg-[#052b27] px-5 text-center text-white"><div className="max-w-md"><LockKeyhole size={45} className="mx-auto text-rose-300"/><h1 className="mt-5 text-3xl font-extrabold">Acesso restrito</h1><p className="mt-4 leading-relaxed text-slate-400">Esta conta não está autorizada a administrar o SaaS. A autorização é concedida somente pelo servidor.</p><button onClick={()=>{logout();navigate(saasLoginPath,{replace:true});}} className="mt-6 rounded-xl bg-emerald-300 px-6 py-3 font-bold text-[#092d2d]">Voltar ao acesso</button></div></main>;

  return <main className="saas-premium saas-v21 min-h-screen font-sans">
    <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0a0f1d] px-5 py-4">
      <Link to="/" aria-label="Bebfy - início" className="inline-flex items-center"><BebfyBrand light compact /></Link>
      <button type="button" aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenu} aria-controls="saas-main-navigation" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
    </div>
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col overflow-y-auto border-r border-white/[.08] bg-[#0a0f1d] p-3 transition-transform lg:translate-x-0 ${mobileMenu?'translate-x-0':'-translate-x-full'}`}>
      <Link to="/" aria-label="Bebfy - início" className="mb-1 inline-flex items-center px-2"><BebfyBrand light compact /></Link>
      <div className="mb-5 ml-[45px] text-[10px] font-black tracking-[.19em] text-emerald-400">CENTRAL DA PLATAFORMA</div>
      <p className="px-3 text-[10px] font-black tracking-[.2em] text-slate-500">PLATAFORMA</p>
      <nav id="saas-main-navigation" aria-label="Navegação administrativa" className="mt-2 space-y-1">
        {tabs.map(t=><button key={t.key} onClick={()=>nav(t.key)} className={`w-full rounded-md px-3 py-2.5 text-left transition ${section===t.key?'bg-emerald-400/15 text-emerald-300':'text-slate-400 hover:bg-white/5 hover:text-white'}`}><span className="flex items-center gap-3 text-sm font-bold"><t.icon size={19}/>{t.title}</span></button>)}
      </nav>
      <div className="mt-auto space-y-4 pt-8">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-4"><ShieldCheck size={19} className="text-emerald-300"/><p className="mt-2 text-xs font-bold">Acesso administrativo</p><p className="mt-1 text-xs text-slate-500">Protegido pelo backend.</p></div>
        <button onClick={()=>{logout();navigate(saasLoginPath,{replace:true});}} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={18}/> Encerrar sessão</button>
      </div>
    </aside>

    <div className="lg:ml-[232px]">
      <header className="saas-topbar flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] bg-[#0a0f1d] px-4 py-2">
        <div><p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Bebfy / Administração da plataforma</p><h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{selected?selected.nomeFantasia:tabs.find(t=>t.key===section)?.title}</h1></div>
        <div className="flex items-center gap-3"><button aria-label="Atualizar dados" onClick={()=>void refresh()} disabled={loading} className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"><RefreshCcw size={18} className={loading?'animate-spin':''}/></button><span className="hidden text-xs font-semibold text-slate-400 sm:block">{user?.nome||'Administrador'}</span><span className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-sm font-bold text-emerald-300">{(user?.nome||'A').slice(0,1).toUpperCase()}</span><button type="button" onClick={()=>setProfileOpen(true)} title="Meu perfil e configurações" aria-label="Meu perfil e configurações" className="rounded-xl border border-white/15 p-2.5 text-emerald-100 hover:bg-white/10"><Settings2 size={19}/></button></div>
      </header>

      <div className="saas-content mx-auto w-full space-y-3 px-3 py-3 sm:px-4">
        {alert&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{alert}</p>}
        {ok&&<div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><Check size={17}/>{ok}<button className="ml-auto" onClick={()=>setOk('')} aria-label="Fechar aviso"><X size={17}/></button></div>}
        {loading?<div className={`${card} p-12 text-center text-slate-400`}>Carregando dados da plataforma…</div>:<>

          {section==='funcionarios'&&<SaasFuncionarios current={user}/>}
          {section==='financeiro'&&<SaasFinanceiro onOpenCompany={id=>void openCompany(id)} initialCompanyId={supportCompanyId}/>}
          {section==='suporte'&&<SaasSuporte empresas={empresas} initialCompanyId={supportCompanyId} onOpenCompany={id=>void openCompany(id)} canOpenCompany={user?.cargo==="SUPER_ADMIN"||!!user?.permissoes.includes("EMPRESAS")}/>}
          {section==='monitoramento'&&<SaasMonitoramento onOpenCompany={id=>void openCompany(id)}/>}
          {section==='auditoria'&&<SaasAuditoria/>}
          {section==='visao'&&<SaasExecutiveOverview
              empresas={empresasDisponiveis?empresas:null}
              canCompanies={user?.cargo==='SUPER_ADMIN'||!!user?.permissoes.includes('EMPRESAS')}
              canFinance={user?.cargo==='SUPER_ADMIN'||!!user?.permissoes.includes('EMPRESAS')}
              canSupport={user?.cargo==='SUPER_ADMIN'||!!user?.permissoes.includes('SUPORTE')}
              onFinance={()=>nav('financeiro')} onSupport={()=>nav('suporte')}
              onMonitor={()=>nav('monitoramento')} onCompanies={()=>nav('empresas')}
              onOpenCompany={id=>void openCompany(id)}
              onCreate={()=>{nav('empresas');setCreating(true);}} onExport={exportarResumo}
            />}

          {section==='empresas'&&!selected&&<SaasCompanies empresas={empresas} planos={planos} busy={busy} onCreate={()=>setCreating(true)} onOpen={id=>void openCompany(id)} onExport={exportarResumo}/>}

          {section==='empresas'&&selected&&<div className="sc-detail">
            <button disabled={busy} onClick={()=>setSelected(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={17}/> Voltar às empresas</button>
            <div className={`${card} p-6`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Building2 size={26}/></span><div><h2 className="text-xl font-extrabold">{selected.nomeFantasia}</h2><p className="mt-1 text-xs text-slate-400">#{selected.id} · {selected.subdominio||selected.slug} · {selected.cnpj||'Documento não cadastrado'}</p></div></div><div className="flex flex-wrap items-center gap-3"><StatusBadge value={selected.status}/><button type="button" onClick={openCompanyEditor} className="rounded-xl border border-emerald-300/25 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-white/5"><Settings2 size={15} className="mr-1 inline"/> Editar cadastro</button></div></div>
              <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-3"><div><span className="text-slate-500">Funcionários</span><strong className="mt-1 block text-xl">{selected._count.funcionarios}</strong></div><div><span className="text-slate-500">Produtos</span><strong className="mt-1 block text-xl">{selected._count.produtos}</strong></div><div><span className="text-slate-500">Vendas</span><strong className="mt-1 block text-xl">{selected._count.vendas}</strong></div></div>
            </div>
            <nav className="sc-tabs" aria-label="Ficha da distribuidora">{([{id:'resumo',label:'Resumo'},{id:'financeiro',label:'Financeiro'},{id:'modulos',label:'Módulos'},{id:'acessos',label:'Acessos'},{id:'historico',label:'Histórico'}] as const).map(t=><button type="button" disabled={busy} key={t.id} aria-pressed={companyTab===t.id} onClick={()=>setCompanyTab(t.id)}>{t.label}</button>)}</nav>
            {companyTab==='resumo'&&<>
            <div className="sc-detail-grid"><section className="sc-panel"><h3>Dados comerciais</h3><dl className="sc-dl"><dt>Razão social</dt><dd>{selected.razaoSocial||'Não informada'}</dd><dt>Documento</dt><dd>{selected.cnpj||'Não informado'}</dd><dt>Telefone</dt><dd>{selected.config?.telefone||'Não informado'}</dd><dt>Endereço</dt><dd>{selected.config?.endereco||'Não informado'}</dd><dt>Cadastro</dt><dd>{new Date(selected.criadoEm).toLocaleDateString('pt-BR')}</dd><dt>Responsável</dt><dd>{selected.funcionarios?.[0]?.nome||'Não localizado'}</dd></dl></section><section className="sc-panel"><h3>Assinatura e operação</h3><dl className="sc-dl"><dt>Plano</dt><dd>{selected.plano?.nome||'Sem plano'}</dd><dt>Mensalidade do plano</dt><dd>{selected.plano?money(Number(selected.plano.precoMensal)):'—'}</dd><dt>Clientes cadastrados</dt><dd>{selected._count.clientes??'—'}</dd><dt>Módulos ativos</dt><dd>{DISPONIVEIS.filter(m=>moduloLiberado(selected,m.key)).length} / {DISPONIVEIS.length}</dd><dt>Situação financeira</dt><dd>{selected.inadimplente?'Inadimplente':'Regular'}</dd><dt>Endereço de acesso</dt><dd><a className="text-emerald-300 break-all" href={'/'+encodeURIComponent(selected.subdominio||selected.slug)} target="_blank" rel="noopener noreferrer">bebfy.com.br/{selected.subdominio||selected.slug}</a></dd></dl></section></div>
            <div className="sc-actions"><a className="sd-secondary" href={'https://bebfy.com.br/'+encodeURIComponent(selected.subdominio||selected.slug)} target="_blank" rel="noopener noreferrer">Abrir login do cliente</a><button type="button" className="sd-secondary" disabled={busy} onClick={()=>{void navigator.clipboard.writeText('https://bebfy.com.br/'+(selected.subdominio||selected.slug)).then(()=>setOk('Link copiado.')).catch(()=>setAlert('Não foi possível copiar. Utilize o link de acesso.'));}}>Copiar link</button><button className="sd-secondary" disabled={busy} onClick={()=>setCompanyTab('financeiro')}>Controle financeiro</button>{(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('SUPORTE'))&&<button className="sd-secondary" disabled={busy} onClick={()=>{setSupportCompanyId(selected.id);setSection('suporte');setSelected(null);}}>Ordens de serviço e suporte</button>}<button className="sd-secondary" disabled={busy} onClick={openCompanyEditor}>Editar dados e responsável</button></div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className={`${card} p-6`}><h3 className="mb-1 font-extrabold">Situação da conta</h3><p className="mb-6 text-xs text-slate-500">Atualiza imediatamente o estado da distribuidora.</p><label className={label}>Status atual</label><select value={selected.status} onChange={e=>{const status=e.target.value as StatusEmpresa;if(status==='SUSPENSA'||status==='CANCELADA'){if(!window.confirm('A empresa perderá acesso ao sistema. Confirmar alteração?'))return;}void updateCompany(()=>saasApi.alterarStatus(selected.id,status),'Status atualizado com sucesso.');}} disabled={busy} className={input}>{(Object.keys(statusText) as StatusEmpresa[]).map(st=><option key={st} value={st}>{statusText[st]}</option>)}</select><p className="mt-4 text-xs text-amber-300">Suspender ou cancelar bloqueia o acesso dos usuários desta empresa.</p></section>
              <section className={`${card} p-6`}><h3 className="mb-1 font-extrabold">Plano de assinatura</h3><p className="mb-6 text-xs text-slate-500">Vincula a empresa a um plano existente no backend.</p><label className={label}>Plano atual</label><select value={selected.planoId??''} onChange={e=>{const planoId=Number(e.target.value);if(planoId&&planoId!==selected.planoId&&window.confirm('Trocar o plano e redefinir as liberações manuais de módulos?'))void updateCompany(()=>saasApi.alterarPlano(selected.id,planoId),'Plano atualizado com sucesso.');}} disabled={busy||!planos.length||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('PLANOS'))} className={input}><option value="">Sem plano</option>{planos.map(p=><option key={p.id} value={p.id}>{p.nome} — {money(Number(p.precoMensal))}/mês</option>)}</select><p className="mt-4 text-xs text-slate-400">A cobrança financeira recorrente não é executada por esta tela.</p></section>
            </div>
            </>}
            {companyTab==='financeiro'&&<>
            <div className="sc-actions"><button className="sd-primary" disabled={busy} onClick={()=>{setSupportCompanyId(selected.id);setSection('financeiro');setSelected(null);}}>Abrir central financeira <ArrowRight size={16}/></button></div>
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
                <button disabled={busy||graceReason.trim().length<8||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('EMPRESAS'))||!['ATIVA','EM_TESTE'].includes(selected.status)} onClick={()=>{if(window.confirm('Prorrogar acesso de '+selected.nomeFantasia+' por '+graceDays+' dias? O prazo vigente será estendido.'))void updateCompany(()=>saasApi.liberarTemporariamente(selected.id,graceDays,graceReason),'Acesso liberado por '+graceDays+' dias.');}} className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40"><LockKeyhole size={16} className="mr-2 inline"/> Liberar temporariamente</button>
                <p className="text-xs text-slate-400">A dívida permanece pendente. Após o prazo, o bloqueio retorna automaticamente. A suspensão administrativa nunca é ignorada.</p>
              </div>}
              {!!selected.historicoLiberacoes?.length&&<div className="mt-6 border-t border-white/10 pt-5"><h4 className="mb-3 text-sm font-bold">Histórico de liberações</h4><div className="space-y-2">{selected.historicoLiberacoes.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#09121e] p-3 text-xs"><span>{item.dias} dias · {item.motivo}</span><span className="text-slate-400">{new Date(item.criadoEm).toLocaleString('pt-BR')} · até {new Date(item.liberadoAte).toLocaleDateString('pt-BR')}</span></div>)}</div></div>}
            </section>
            <section className={card+' space-y-5 p-6'}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-base font-extrabold">Cobranças e boletos · Controle manual</h3><p className="mt-1 text-xs text-slate-400">Registre vencimentos e pagamentos informados. Sem emissão de boletos ou conciliação bancária.</p></div>
                <button type="button" onClick={()=>{setBillingOpen(true);setAlert('');}} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 px-4 py-3 text-xs font-bold text-emerald-200"><Plus size={16}/> Nova cobrança</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[580px] text-left text-xs"><thead className="bg-white/5 text-slate-300"><tr><th className="p-3">REFERÊNCIA</th><th className="p-3">VALOR</th><th className="p-3">VENCIMENTO</th><th className="p-3">SITUAÇÃO</th><th className="p-3">AÇÃO</th></tr></thead>
                  <tbody className="divide-y divide-white/10">{cobrancas.map(b=>{
                    const vencido=!b.pagoEm&&new Date(b.vencimento).getTime()<Date.now();
                    return <tr key={b.id}><td className="p-3"><strong className="block text-sm">{b.referencia}</strong>{b.linhaDigitavel&&<span className="block max-w-[200px] truncate text-[11px] text-slate-400" title={b.linhaDigitavel}>{b.linhaDigitavel}</span>}</td><td className="p-3">{money(Number(b.valor))}</td><td className="p-3">{new Date(b.vencimento).toLocaleDateString('pt-BR')}</td><td className="p-3"><span className={'rounded-full px-2 py-1 font-bold '+(b.pagoEm?'bg-emerald-400/10 text-emerald-200':vencido?'bg-rose-400/10 text-rose-200':'bg-amber-400/10 text-amber-200')}>{b.pagoEm?'Pago':vencido?'Vencido':'Pendente'}</span></td><td className="p-3"><button type="button" disabled={busy} className="font-bold text-emerald-200 hover:underline disabled:opacity-40" onClick={()=>void markCobranca(b,!b.pagoEm)}>{b.pagoEm?'Desmarcar':'Marcar pago'}</button></td></tr>;
                  })}{!cobrancas.length&&<tr><td colSpan={5} className="p-8 text-center text-sm text-slate-400">Nenhuma cobrança registrada para esta distribuidora.</td></tr>}</tbody>
                </table>
              </div>
            </section>
            </>}
            {companyTab==='modulos'&&<section className={`${card} p-6`}><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">Módulos disponíveis</h3><p className="mt-1 text-xs text-slate-500">Ative ou desative as funcionalidades atribuídas a esta empresa.</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">{DISPONIVEIS.filter(m=>moduloLiberado(selected,m.key)).length} disponíveis</span></div>
              <div className="grid gap-3 md:grid-cols-2">{MODULOS.map(m=>{const configuracao=selected.modulosAtivos.find(x=>x.modulo===m.key);
                const enabled=moduloLiberado(selected,m.key);return <div key={m.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-[#101829] p-4"><div className="min-w-0"><strong className="text-sm">{m.nome}</strong><p className="mt-1 text-xs text-slate-500">{m.descricao}</p><p className="mt-1 text-[10px] text-slate-400">{PENDENTES.includes(m.key)?'Em desenvolvimento':configuracao?'Exceção manual':selected.planoId?'Conforme plano':'Empresa sem plano (legado)'}</p></div><button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled?'Desativar':'Ativar'} ${m.nome}`} disabled={busy||PENDENTES.includes(m.key)||!(user?.cargo==='SUPER_ADMIN'||user?.permissoes.includes('MODULOS'))} onClick={()=>void updateCompany(()=>saasApi.alternarModulo(selected.id,m.key,!enabled),`Módulo ${m.nome} atualizado.`)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${enabled?'bg-emerald-400':'bg-slate-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled?'left-6':'left-1'}`}/></button></div>})}</div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-amber-200/80"><CircleAlert size={16} className="shrink-0"/> O plano define os módulos disponíveis. As exceções manuais têm prioridade e são redefinidas na troca de plano. Recursos em desenvolvimento não podem ser ativados.</p>
            </section>}
            {companyTab==='acessos'&&<section className="sc-panel"><h3>Responsável e credenciais</h3>{selected.funcionarios?.[0]?<><dl className="sc-dl"><dt>Proprietário</dt><dd>{selected.funcionarios[0].nome}</dd><dt>Código de acesso</dt><dd>{selected.funcionarios[0].codigo??'—'}</dd><dt>E-mail</dt><dd>{selected.funcionarios[0].usuario?.email||'Não cadastrado'}</dd><dt>Conta do usuário</dt><dd>{selected.funcionarios[0].usuario?.ativo?'Ativa':'Inativa ou não cadastrada'}</dd><dt>Situação da empresa</dt><dd>{statusText[selected.status]}</dd></dl><button className="sd-primary" disabled={busy} onClick={openCompanyEditor}>Editar responsável / senha temporária</button><p className="sd-muted">Não é possível visualizar a senha atual. A redefinição encerra a sessão anterior. O gerenciamento dos demais funcionários continua no painel da distribuidora.</p></>:<p className="sd-empty">Proprietário não localizado.</p>}</section>}
            {companyTab==='historico'&&<SaasCompanyHistory empresa={selected}/>}
          </div>}

          {section==='planos'&&<SaasPlans planos={planos} available={planosDisponiveis} busy={busy} descriptions={modDescriptions} onCreate={()=>openPlanEditor()} onEdit={openPlanEditor} onRefresh={()=>void refresh()}/>}

          {section==='modulos'&&<SaasModules descriptions={modDescriptions} onDescriptions={setModDescriptions}/>}

        </>}
      </div>
    </div>


    {billingOpen&&selected&&<div role="dialog" aria-modal="true" aria-labelledby="saas-billing-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={e=>void addCobranca(e)} className="max-h-[95dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl border border-white/15 bg-[#232e30] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-emerald-300">CONTROLE FINANCEIRO</p><h2 id="saas-billing-title" className="mt-1 text-2xl font-extrabold">Registrar cobrança</h2></div><button type="button" onClick={()=>setBillingOpen(false)} aria-label="Fechar" className="rounded-lg p-2 hover:bg-white/10"><X size={20}/></button></div>
        {alert&&<p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{alert}</p>}
        <label className="block text-xs font-semibold text-slate-300">Referência<input className={input+' mt-2'} maxLength={120} required value={billingForm.referencia} onChange={e=>setBillingForm(p=>({...p,referencia:e.target.value}))} placeholder="Mensalidade 11/2026"/></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300">Valor (R$)<input className={input+' mt-2'} required inputMode="numeric" value={money(billingForm.valor)} onChange={e=>setBillingForm(p=>({...p,valor:Number(moneyInput(e.target.value))/100}))}/></label>
          <label className="text-xs font-semibold text-slate-300">Vencimento<input type="date" required className={input+' mt-2'} value={billingForm.vencimento} onChange={e=>setBillingForm(p=>({...p,vencimento:e.target.value}))}/></label>
        </div>
        <label className="block text-xs font-semibold text-slate-300">Linha digitável (opcional)<input className={input+' mt-2'} maxLength={120} value={billingForm.linhaDigitavel} onChange={e=>setBillingForm(p=>({...p,linhaDigitavel:e.target.value}))}/></label>
        <label className="block text-xs font-semibold text-slate-300">Observação (opcional)<textarea className={input+' mt-2'} rows={2} maxLength={500} value={billingForm.observacao} onChange={e=>setBillingForm(p=>({...p,observacao:e.target.value}))}/></label>
        <p className="text-xs leading-5 text-amber-200/80">Registro manual: não gera boleto, não efetua cobrança e não verifica recebimentos automaticamente.</p>
        <div className="flex justify-end gap-2"><button type="button" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold" onClick={()=>setBillingOpen(false)}>Cancelar</button><button type="submit" disabled={busy||billingForm.valor<=0} className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-extrabold text-[#0b3329] disabled:opacity-50">{busy?'Salvando...':'Registrar cobrança'}</button></div>
      </form>
    </div>}
    {companyEdit&&selected&&<div role="dialog" aria-modal="true" aria-labelledby="company-edit-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={e=>void saveCompanyDetails(e)} className="max-h-[95dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-white/15 bg-[#222b2e] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold tracking-widest text-emerald-300">DISTRIBUIDORA #{selected.id}</p><h2 id="company-edit-title" className="mt-1 text-2xl font-extrabold">Editar cadastro</h2></div><button type="button" onClick={()=>{if(!busy&&window.confirm('Descartar alterações do cadastro?'))setCompanyEdit(false);}} aria-label="Fechar" className="rounded-lg p-2 hover:bg-white/10"><X size={21}/></button></div>
        {alert&&<p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{alert}</p>}
        <h3 className="border-b border-white/10 pb-2 font-extrabold">Dados da empresa</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">Nome fantasia<input required minLength={2} className={input+' mt-2'} value={companyForm.nomeFantasia} onChange={e=>setCompanyForm(p=>({...p,nomeFantasia:e.target.value}))}/></label>
          <label className="text-xs font-bold text-slate-300">Razão social<input required minLength={2} className={input+' mt-2'} value={companyForm.razaoSocial} onChange={e=>setCompanyForm(p=>({...p,razaoSocial:e.target.value}))}/></label>
          <label className="text-xs font-bold text-slate-300">CPF / CNPJ<input required inputMode="numeric" maxLength={18} className={input+' mt-2'} value={companyForm.documento} onChange={e=>setCompanyForm(p=>({...p,documento:cleanDigits(e.target.value).length>11?maskCnpj(e.target.value):maskCpf(e.target.value)}))}/></label>
          <label className="text-xs font-bold text-slate-300">Telefone comercial<input required inputMode="tel" maxLength={15} className={input+' mt-2'} value={companyForm.telefone} onChange={e=>setCompanyForm(p=>({...p,telefone:maskPhone(e.target.value)}))}/></label>
        </div>
        <h3 className="border-b border-white/10 pb-2 pt-3 font-extrabold">Responsável e acesso</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">Nome do proprietário<input required minLength={2} className={input+' mt-2'} value={companyForm.nomeResponsavel} onChange={e=>setCompanyForm(p=>({...p,nomeResponsavel:e.target.value}))}/></label>
          <label className="text-xs font-bold text-slate-300">CPF do proprietário<input required inputMode="numeric" maxLength={14} className={input+' mt-2'} value={companyForm.cpfResponsavel} onChange={e=>setCompanyForm(p=>({...p,cpfResponsavel:maskCpf(e.target.value)}))}/></label>
          <label className="text-xs font-bold text-slate-300">E-mail do proprietário<input type="email" required className={input+' mt-2'} value={companyForm.emailResponsavel} onChange={e=>setCompanyForm(p=>({...p,emailResponsavel:e.target.value}))}/></label>
          <label className="text-xs font-bold text-slate-300">Nova senha temporária (opcional)<input type="password" autoComplete="new-password" className={input+' mt-2'} value={companyForm.senhaTemporaria} onChange={e=>setCompanyForm(p=>({...p,senhaTemporaria:e.target.value}))} placeholder="Não preencha para manter a senha"/></label>
        </div>
        <p className="text-xs leading-5 text-slate-400">As senhas atuais não podem ser visualizadas. Definir uma senha temporária encerra a sessão anterior e obriga o proprietário a trocar a senha no próximo acesso.</p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={()=>{if(!busy&&window.confirm('Descartar alterações do cadastro?'))setCompanyEdit(false);}} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-[#0b3329] disabled:opacity-50">{busy?'Salvando...':'Salvar alterações'}</button></div>
      </form>
    </div>}
    {planModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Formulário de plano"><form onSubmit={e=>void savePlan(e)} className="sp-editor max-h-[94dvh] w-full max-w-[790px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0f1d] p-4 shadow-2xl sm:p-5">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Planos SaaS</p><h2 className="mt-1 text-2xl font-extrabold">{editPlan?'Editar plano':'Novo plano'}</h2></div><button type="button" disabled={busy} onClick={()=>{if(!busy&&window.confirm('Descartar alterações do plano?'))setPlanModal(false);}} aria-label="Fechar"><X size={22}/></button></div>
      {alert&&<p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{alert}</p>}
      <div><label htmlFor="plano-nome" className={label}>Nome do plano</label><input id="plano-nome" required minLength={2} maxLength={120} className={input} value={planData.nome} onChange={e=>setPlanData(p=>({...p,nome:e.target.value}))} placeholder="Bebfy Pro"/></div>
      <div><label htmlFor="plano-tipo" className={label}>Tipo</label><select id="plano-tipo" className={input} value={planData.tipo} onChange={e=>{const tipo=e.target.value as PlanoEntrada['tipo'];setPlanData(p=>({...p,tipo}));}}><option value="VAREJO_BASICO">Basic · Distribuidora de bairro</option><option value="VAREJO_PRO">Pro</option><option value="ATACADO_FULL">Atacado · em evolução</option><option value="PERSONALIZADO">Personalizado</option></select></div>
      <div><label htmlFor="plano-preco" className={label}>Mensalidade (R$)</label><input id="plano-preco" className={input} required inputMode="numeric" value={money(planData.precoMensal)} onChange={e=>setPlanData(p=>({...p,precoMensal:Number(moneyInput(e.target.value))/100}))} aria-describedby="plano-price-hint"/><p id="plano-price-hint" className="mt-1 text-xs text-slate-400">Digite os centavos. Exemplo: 7990 corresponde a R$ 79,90.</p></div>
      <div className="sp-module-editor space-y-3 rounded-xl border border-white/10 p-3">
        <div className="sd-panel-head"><div><h3 className="text-sm font-extrabold">Módulos incluídos no plano</h3><p className="mt-1 text-xs text-slate-400">Os módulos selecionados são herdados pelas empresas do plano. Recursos de atacado em desenvolvimento não são comercializáveis.</p></div><button className="sd-secondary" type="button" disabled={busy} onClick={()=>setPlanData(p=>({...p,modulosPadrao:[...PLANOS_PADRAO[p.tipo]]}))}>Aplicar padrão do tipo</button></div>
        <div className="grid gap-2 sm:grid-cols-2">{MODULOS.map(m=><label key={m.key} className="flex cursor-pointer items-center gap-2 text-xs text-slate-200"><input type="checkbox" disabled={PENDENTES.includes(m.key)} checked={(planData.modulosPadrao||[]).includes(m.key)&&!PENDENTES.includes(m.key)} onChange={e=>setPlanData(p=>({...p,modulosPadrao:e.target.checked?[...(p.modulosPadrao||[]),m.key]:(p.modulosPadrao||[]).filter(k=>k!==m.key)}))}/>{m.nome}{PENDENTES.includes(m.key)?' · Em desenvolvimento':''}</label>)}</div>
      </div>
      <div className="sc-panel"><h3>Resumo da assinatura</h3><dl className="sc-dl"><dt>Mensalidade</dt><dd>{money(planData.precoMensal)}</dd><dt>Módulos selecionados</dt><dd>{(planData.modulosPadrao||[]).filter(m=>!PENDENTES.includes(m)).length} / {DISPONIVEIS.length}</dd>{editPlan!==null&&<><dt>Empresas vinculadas</dt><dd>{planos.find(p=>p.id===editPlan)?.resumo?.total??'—'}</dd><dt>Mensalidade atual</dt><dd>{money(Number(planos.find(p=>p.id===editPlan)?.precoMensal??0))}</dd></>}</dl><p className="sd-muted">O tipo é uma classificação comercial. Aplicar o padrão do tipo redefine a seleção de módulos. Cobranças anteriores são preservadas.</p></div>
      <div className="flex gap-3 justify-end"><button type="button" disabled={busy} onClick={()=>{if(!busy&&window.confirm('Descartar alterações do plano?'))setPlanModal(false);}} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-[#062116] disabled:opacity-50">{busy?'Salvando…':'Salvar plano'}</button></div>
    </form></div>}
    {creating&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cadastrar distribuidora"><div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1d] p-5 shadow-2xl sm:p-8"><div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Novo cliente SaaS</p><h2 className="mt-1 text-2xl font-extrabold">Cadastrar distribuidora</h2></div><button onClick={()=>{if(!busy&&window.confirm('Fechar cadastro e descartar os dados preenchidos?'))setCreating(false);}} aria-label="Fechar" className="rounded-xl bg-white/5 p-2"><X size={21}/></button></div>
      {alert&&<p role="alert" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{alert}</p>}
      <form onSubmit={e=>void createCompany(e)} className="space-y-5">
        <p className="border-b border-white/10 pb-2 text-sm font-extrabold">Dados da empresa</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="empresa-nome" className={label}>Nome da distribuidora</label><input id="empresa-nome" className={input} required value={newCompany.nome} onChange={e=>setNewCompany(p=>({...p,nome:e.target.value}))} placeholder="Ex.: Adega Central"/></div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="empresa-cnpj" className="text-xs font-semibold text-slate-300">Documento da distribuidora</label><div role="group" aria-label="Tipo de documento" className="inline-flex overflow-hidden rounded-lg border border-white/15">{(['CNPJ','CPF'] as const).map(tipo=><button key={tipo} type="button" aria-pressed={documentType===tipo} onClick={()=>{setDocumentType(tipo);setNewCompany(p=>({...p,documento:''}));}} className={'px-3 py-1 text-xs font-bold '+(documentType===tipo?'bg-emerald-300 text-[#0c302b]':'text-slate-300')}>{tipo}</button>)}</div></div>
            <input id="empresa-cnpj" className={input} required inputMode="numeric" maxLength={documentType==='CNPJ'?18:14} value={newCompany.documento} onChange={e=>setNewCompany(p=>({...p,documento:documentType==='CNPJ'?maskCnpj(e.target.value):maskCpf(e.target.value)}))} placeholder={documentType==='CNPJ'?'00.000.000/0000-00':'000.000.000-00'}/>
          </div>
          <div><label htmlFor="empresa-slug" className={label}>Endereço exclusivo da distribuidora</label><input id="empresa-slug" className={input} required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={newCompany.subdominio} onChange={e=>setNewCompany(p=>({...p,subdominio:e.target.value.toLowerCase()}))} placeholder="adega-central" aria-describedby="empresa-slug-status"/><p className="mt-1 text-xs text-slate-400">bebfy.com.br/{normalizedSlug||'seu-endereco'}</p><div id="empresa-slug-status" role="status" aria-live="polite" className="mt-2 text-xs">{slugCheck.status==='checking'&&<span className="text-slate-300">Verificando disponibilidade…</span>}{slugCheck.status==='available'&&<span className="text-emerald-300">✓ Endereço disponível</span>}{slugCheck.status==='taken'&&<span className="text-rose-300">Este endereço já existe ou é reservado. Escolha outro.</span>}{slugCheck.status==='error'&&<span className="text-amber-300">Não foi possível verificar o endereço. Tente novamente.</span>}</div>{slugCheck.status==='taken'&&slugCheck.sugestoes.length>0&&<div className="mt-2 flex flex-wrap gap-2"><span className="w-full text-xs text-slate-300">Sugestões disponíveis:</span>{slugCheck.sugestoes.map(s=><button type="button" key={s} onClick={()=>setNewCompany(p=>({...p,subdominio:s}))} className="rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10">{s}</button>)}</div>}</div>
          <div><label htmlFor="empresa-telefone" className={label}>Telefone comercial</label><input id="empresa-telefone" className={input} required value={newCompany.telefone} onChange={e=>setNewCompany(p=>({...p,telefone:maskPhone(e.target.value)}))} placeholder="(11) 99999-9999"/></div>
          <div className="sm:col-span-2"><label htmlFor="empresa-plano" className={label}>Plano inicial</label><select id="empresa-plano" className={input} required value={newCompany.planoId||''} onChange={e=>setNewCompany(p=>({...p,planoId:Number(e.target.value)}))}><option value="">Selecione um plano</option>{planos.map(p=><option key={p.id} value={p.id}>{p.nome} — {money(Number(p.precoMensal))}/mês</option>)}</select><p className="mt-2 text-xs text-emerald-200/80">{planos.find(p=>p.id===newCompany.planoId)?.modulosPadrao?.length ? 'Módulos incluídos: '+MODULOS.filter(m=>planos.find(p=>p.id===newCompany.planoId)?.modulosPadrao?.includes(m.key)).map(m=>m.nome).join(', ') : 'Este plano não tem módulos padrão configurados.'}</p></div>
        </div>
        <p className="border-b border-white/10 pb-2 pt-2 text-sm font-extrabold">Responsável e acesso inicial</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="responsavel" className={label}>Nome do proprietário</label><input id="responsavel" className={input} required value={newCompany.nomeResponsavel} onChange={e=>setNewCompany(p=>({...p,nomeResponsavel:e.target.value}))}/></div>
          <div><label htmlFor="cpf" className={label}>CPF (11 dígitos)</label><input id="cpf" className={input} required inputMode="numeric" maxLength={14} value={newCompany.cpfResponsavel} onChange={e=>setNewCompany(p=>({...p,cpfResponsavel:maskCpf(e.target.value)}))}/></div>
          <div><label htmlFor="email" className={label}>E-mail do responsável</label><input id="email" type="email" className={input} required autoComplete="off" value={newCompany.email} onChange={e=>setNewCompany(p=>({...p,email:e.target.value}))}/></div>
          <div><label htmlFor="senha-inicial" className={label}>Senha inicial</label><input id="senha-inicial" type="password" className={input} required autoComplete="new-password" value={newCompany.senhaInicial} onChange={e=>setNewCompany(p=>({...p,senhaInicial:e.target.value}))}/></div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">A empresa será criada no status “Em teste”, com um proprietário inicial e código de operador 1. Oriente o responsável a trocar sua senha após o primeiro acesso.</p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={()=>{if(!busy&&window.confirm('Fechar cadastro e descartar os dados preenchidos?'))setCreating(false);}} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold">Cancelar</button><button disabled={busy||!planos.length||slugCheck.status!=='available'} type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-[#062116] disabled:opacity-50">{busy?'Salvando…':'Criar distribuidora'} <Check size={17}/></button></div>
      </form></div></div>}
    <SaasProfile open={profileOpen} onClose={()=>setProfileOpen(false)} />
  </main>;
}
