import {useCallback,useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {Building2,Settings,ShieldCheck,Receipt,Boxes,Save,RefreshCcw,LockKeyhole,KeyRound,UserRound,Eye,EyeOff,CheckCircle2,AlertTriangle,Printer} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {api} from '../services/api';
import {tenantPath} from '../services/tenantUrls';
import {useAuth} from '../contexts/AuthContext';
import {MODULOS} from '../services/saas';
import {mensagemErro,Notice,maskPhone} from '../components/ui';
import {ProfileModal} from '../components/ProfileModal';
import './configuracoes-premium.css';

type Aba='empresa'|'operacao'|'comprovantes'|'seguranca'|'modulos';
type Config={telefone:string;endereco:string;mensagemComprovante:string;obrigarCpfClienteVenda:boolean;revisao:string|null};
type Dados={empresa:{id:number;nomeFantasia:string;razaoSocial:string|null;cnpj:string|null;slug:string;status:string;plano:string|null};config:Config;modulos:Record<string,boolean>;podeEditar:boolean};
const tabs=[{id:'empresa',n:'Empresa',Icon:Building2},{id:'operacao',n:'Operação',Icon:Settings},{id:'comprovantes',n:'Comprovantes',Icon:Receipt},{id:'seguranca',n:'Segurança',Icon:ShieldCheck},{id:'modulos',n:'Módulos',Icon:Boxes}] as const;
const ativos=['CAIXA_PDV','FIADOS','VASILHAMES_RETORNAVEIS','ENTREGAS_DELIVERY','ESTOQUE_LOTES','COMPRAS_FORNECEDORES','RELATORIOS_AVANCADOS'];
export function ConfiguracoesPage(){
 const {user,empresa,logout}=useAuth();const navigate=useNavigate();
 const gestor=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo??'');
 const [aba,setAba]=useState<Aba>(gestor?'empresa':'seguranca'),[dados,setDados]=useState<Dados|null>(null),[draft,setDraft]=useState<Config|null>(null);
 const [loading,setLoading]=useState(gestor),[busy,setBusy]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState('');
 const [perfil,setPerfil]=useState(false),[senhaAtual,setSenhaAtual]=useState(''),[novaSenha,setNovaSenha]=useState(''),[confirmar,setConfirmar]=useState(''),[mostrar,setMostrar]=useState(false);
 const request=useRef(0),lock=useRef(false);
 const load=useCallback(async()=>{if(!gestor)return;const n=++request.current;setLoading(true);setErro('');try{const r=await api.get<Dados>('/configuracoes');if(n===request.current){setDados(r.data);setDraft({...r.data.config});}}catch(e){if(n===request.current){setDados(null);setDraft(null);setErro(mensagemErro(e));}}finally{if(n===request.current)setLoading(false);}},[gestor]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 const mudou=Boolean(draft&&dados&&JSON.stringify(draft)!==JSON.stringify(dados.config));
 const editavel=Boolean(dados?.podeEditar&&!busy&&!loading);
 const update=<K extends keyof Config,>(key:K,v:Config[K])=>setDraft(prev=>prev?{...prev,[key]:v}:prev);
 async function salvar(e:FormEvent){e.preventDefault();if(!draft||!editavel||!mudou||lock.current)return;
  if(draft.telefone&&!/^\d{10,11}$/.test(draft.telefone)){setErro('Informe o telefone comercial com DDD e 8 ou 9 dígitos.');return;}
  lock.current=true;setBusy(true);setErro('');setSucesso('');
  try{const r=await api.patch<Dados>('/configuracoes',draft);setDados(r.data);setDraft({...r.data.config});setSucesso('Configurações salvas com sucesso.');}
  catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 async function senha(e:FormEvent){e.preventDefault();if(lock.current)return;
  if(novaSenha.length<10||new TextEncoder().encode(novaSenha).length>72||!novaSenha.trim()||novaSenha===senhaAtual||novaSenha!==confirmar){setErro('Use uma senha diferente, de pelo menos 10 caracteres e até 72 bytes, e confirme corretamente.');return;}
  lock.current=true;setBusy(true);setErro('');setSucesso('');
  try{await api.post('/auth/alterar-senha',{senhaAtual,novaSenha,confirmarNovaSenha:confirmar});setSenhaAtual('');setNovaSenha('');setConfirmar('');logout();navigate(tenantPath(),{replace:true});}
  catch(e){setErro(mensagemErro(e));}finally{lock.current=false;setBusy(false);}
 }
 const trocar=(a:Aba)=>{setAba(a);setErro('');setSucesso('');setSenhaAtual('');setNovaSenha('');setConfirmar('');setMostrar(false);};
 const empresaNome=dados?.empresa.nomeFantasia??empresa?.nomeFantasia??'Distribuidora';
 return <div className="cf-page">
 <header className="cf-header"><span className="cf-icon"><Settings size={26}/></span><div><h1>Configurações gerais</h1><p>Preferências da distribuidora, segurança e informações do plano.</p></div>{gestor&&<button type="button" className="cf-secondary" disabled={loading||busy} onClick={()=>{if(!mudou||window.confirm('Descartar alterações não salvas?'))void load();}}><RefreshCcw size={16}/> Atualizar</button>}</header>
 <Notice message={erro} onClose={()=>setErro('')}/><Notice message={sucesso} success onClose={()=>setSucesso('')}/>
 <nav className="cf-tabs" aria-label="Configurações">{tabs.filter(t=>gestor||t.id==='seguranca').map(t=><button type="button" disabled={busy} key={t.id} aria-pressed={aba===t.id} onClick={()=>trocar(t.id)}><t.Icon size={17}/>{t.n}</button>)}</nav>
 {aba==='seguranca'?<div className="cf-grid cf-security">
 <section className="cf-panel"><h2><UserRound size={19}/> Minha conta</h2><div className="cf-person"><span>{(user?.nome??'U')[0].toUpperCase()}</span><div><strong>{user?.nome}</strong><small>{user?.cargo?.replaceAll('_',' ')}</small></div></div><dl><dt>Código de acesso</dt><dd>{user?.codigo??'—'}</dd><dt>Empresa</dt><dd>{empresaNome}</dd><dt>Domínio de acesso</dt><dd>{empresa?.subdominio??'—'}</dd></dl><button className="cf-secondary" type="button" disabled={busy} onClick={()=>setPerfil(true)}><UserRound size={16}/> Editar meu perfil</button><p className="cf-note"><ShieldCheck size={17}/> Seu acesso é individual. Um novo login confirmado pode encerrar a sessão anterior.</p></section>
 <section className="cf-panel"><h2><LockKeyhole size={19}/> Alterar senha</h2><p>Por segurança, a sessão será encerrada após a alteração.</p><form className="cf-form" onSubmit={senha}><label>Senha atual<input type={mostrar?'text':'password'} required autoComplete="current-password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} disabled={busy}/></label><label>Nova senha<input type={mostrar?'text':'password'} required minLength={10} maxLength={72} autoComplete="new-password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} disabled={busy}/></label><label>Confirmar nova senha<input type={mostrar?'text':'password'} required autoComplete="new-password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} disabled={busy}/></label><button type="button" className="cf-secondary" onClick={()=>setMostrar(!mostrar)}>{mostrar?<EyeOff size={16}/>:<Eye size={16}/>} {mostrar?'Ocultar senhas':'Mostrar senhas'}</button><button type="submit" className="cf-primary" disabled={busy}><KeyRound size={17}/> {busy?'Salvando...':'Alterar senha'}</button></form></section>
 </div>:loading?<section className="cf-panel">Carregando configurações...</section>:!dados||!draft?<section className="cf-panel">Não foi possível carregar as configurações. Atualize para tentar novamente.</section>:aba==='modulos'?<section className="cf-panel"><h2><Boxes size={19}/> Módulos da distribuidora</h2><div className="cf-plan"><div><small>Plano contratado</small><strong>{dados.empresa.plano??'Sem plano vinculado'}</strong></div><span className="cf-status">{dados.empresa.status}</span></div><div className="cf-module-grid">{MODULOS.filter(m=>ativos.includes(m.key)).map(m=><div className="cf-module" key={m.key}><Boxes size={20}/><div><strong>{m.nome}</strong><small>{m.descricao}</small></div><span className={dados.modulos[m.key]?'cf-status':'cf-status off'}>{dados.modulos[m.key]?'Ativo':'Desativado'}</span></div>)}</div><p className="cf-note"><ShieldCheck size={17}/> A contratação e a ativação dos módulos são administradas pelo SaaS. Esta tela é somente para consulta.</p></section>:
 <form onSubmit={salvar} className="cf-form">
 {!dados.podeEditar&&<p className="cf-note"><LockKeyhole size={17}/> Consulta liberada. Somente proprietários e administradores podem alterar estas configurações.</p>}
 {aba==='empresa'&&<section className="cf-panel"><h2><Building2 size={19}/> Identificação da distribuidora</h2><p>Informações comerciais utilizadas nos comprovantes.</p><div className="cf-grid"><label>Nome fantasia<input value={dados.empresa.nomeFantasia} readOnly/></label><label>Razão social<input value={dados.empresa.razaoSocial??''} readOnly placeholder="Não informada"/></label><label>CNPJ / documento oficial<input value={dados.empresa.cnpj??''} readOnly placeholder="Não informado"/></label><label>Domínio de acesso<input value={dados.empresa.slug} readOnly/></label><label>Telefone comercial<input inputMode="tel" value={maskPhone(draft.telefone)} onChange={e=>update('telefone',e.target.value.replace(/\D/g,'').slice(0,11))} disabled={!editavel}/></label><label className="cf-full">Endereço comercial<textarea rows={3} maxLength={300} value={draft.endereco} disabled={!editavel} onChange={e=>update('endereco',e.target.value)}/></label></div><p className="cf-note"><LockKeyhole size={17}/> Nome oficial, documento e endereço de acesso são administrados pelo SaaS.</p></section>}
 {aba==='operacao'&&<section className="cf-panel"><h2><Settings size={19}/> Preferências operacionais</h2><p>As alterações se aplicam às novas vendas da empresa.</p><label className="cf-rule"><span><strong>Exigir identificação do cliente na venda</strong><small>O PDV exige um cliente ativo com CPF ou CNPJ válido. Vendas anônimas deixam de ser permitidas.</small></span><input type="checkbox" checked={draft.obrigarCpfClienteVenda} disabled={!editavel} onChange={e=>update('obrigarCpfClienteVenda',e.target.checked)}/></label><div className="cf-rule"><span><strong>Bloquear estoque insuficiente</strong><small>Proteção permanente contra venda acima do saldo disponível.</small></span><span className="cf-status">Obrigatório</span></div><div className="cf-rule"><span><strong>Controle de limite de crédito</strong><small>As condições de fiado seguem a modalidade e o limite de cada cliente.</small></span><span className="cf-status">Obrigatório</span></div><p className="cf-note"><AlertTriangle size={17}/> Ao exigir documento, confira os cadastros existentes antes de iniciar as vendas.</p></section>}
 {aba==='comprovantes'&&<div className="cf-grid"><section className="cf-panel"><h2><Receipt size={19}/> Comprovante comercial</h2><p>Personalize a mensagem impressa no rodapé do comprovante não fiscal.</p><label>Mensagem de atendimento<textarea rows={5} maxLength={240} value={draft.mensagemComprovante} disabled={!editavel} onChange={e=>update('mensagemComprovante',e.target.value)} placeholder="Obrigado pela preferência!"/></label><small>{draft.mensagemComprovante.length}/240 caracteres</small><p className="cf-note"><Printer size={17}/> A mensagem será exibida no PDV e no histórico de vendas. Reimpressões usam os dados comerciais atuais.</p></section><section className="cf-panel"><h2><Receipt size={19}/> Prévia do comprovante</h2><div className="cf-paper"><strong>{empresaNome}</strong>{draft.endereco&&<p>{draft.endereco}</p>}{draft.telefone&&<p>{maskPhone(draft.telefone)}</p>}<b>COMPROVANTE NÃO FISCAL</b><hr/><p>Produto exemplo × 2 <span>R$ 20,00</span></p><hr/><p><b>Total</b><b>R$ 20,00</b></p>{draft.mensagemComprovante&&<p className="cf-message">{draft.mensagemComprovante}</p>}<small>Documento interno sem valor fiscal.</small></div><small>Valores ilustrativos, não correspondem a uma venda real.</small></section></div>}
 {dados.podeEditar&&<footer className="cf-footer"><span>{mudou?'Alterações não salvas':'Configuração sincronizada'}</span><button type="button" className="cf-secondary" disabled={!mudou||busy} onClick={()=>setDraft({...dados.config})}>Descartar</button><button type="submit" className="cf-primary" disabled={!mudou||!editavel}><Save size={17}/> {busy?'Salvando...':'Salvar alterações'}</button></footer>}
 </form>}
 <div className="cf-end"><CheckCircle2 size={15}/> Configurações isoladas por distribuidora. Sem integrações fiscais ou bancárias.</div>
 <ProfileModal mode="tenant" open={perfil} onClose={()=>setPerfil(false)}/>
 </div>;
}
