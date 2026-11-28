import {useEffect,useState} from 'react';
import {saasApi} from '../services/saas';
import type {EmpresaSaas,SaasAssinaturaPagina} from '../services/saas';
const eventos:Record<string,string>={ASSINATURA_CRIADA:'Contratação inicial',ASSINATURA_PLANO_ALTERADO:'Alteração de plano',ASSINATURA_STATUS_ALTERADO:'Alteração de situação',PRORROGACAO_TESTE:'Prorrogação do teste'};
const status:Record<string,string>={ATIVA:'Ativa',EM_TESTE:'Em teste',SUSPENSA:'Suspensa',CANCELADA:'Cancelada'};
export function SaasAssinatura({empresa}:{empresa:EmpresaSaas}){
 const [pagina,setPagina]=useState(1),[revisao,setRevisao]=useState(0),[dados,setDados]=useState<SaasAssinaturaPagina|null>(null),[erro,setErro]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{setPagina(1);},[empresa.id]);
 useEffect(()=>{let ativo=true;setDados(null);setLoading(true);setErro(false);void saasApi.historicoAssinatura(empresa.id,pagina).then(r=>{if(ativo)setDados(r);}).catch(()=>{if(ativo)setErro(true);}).finally(()=>{if(ativo)setLoading(false);});return()=>{ativo=false;};},[empresa.id,empresa.status,empresa.planoId,empresa.testeAte,pagina,revisao]);
 const atual=dados?.empresa;const paginas=Math.max(1,Math.ceil((dados?.total??0)/(dados?.limite??20)));
 return <section className="sc-panel"><div className="sd-panel-head"><div><h3>Histórico de assinaturas</h3><p className="sd-muted">Ciclo de vida comercial e alterações registradas.</p></div><button type="button" className="sd-secondary" disabled={loading} onClick={()=>setRevisao(r=>r+1)}>Atualizar</button></div>
 {atual&&<div className="mb-4 grid gap-3 sm:grid-cols-3"><div><small className="sd-muted">Plano atual</small><p className="font-bold">{atual.plano?.nome??'Sem plano'}</p></div><div><small className="sd-muted">Mensalidade</small><p className="font-bold">{atual.plano?Number(atual.plano.precoMensal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</p></div><div><small className="sd-muted">Situação</small><p className="font-bold">{status[atual.status]}</p></div></div>}
 {erro&&<p role="alert" className="sd-warning">Não foi possível consultar o histórico. Atualize para tentar novamente.</p>}{loading&&<p role="status" className="sd-muted">Carregando histórico…</p>}
 <div className="sc-events">{dados?.itens.map(i=><article key={i.id}><strong>{eventos[i.acao]??i.acao}</strong><p>{i.descricao}</p><small>{new Date(i.criadoEm).toLocaleString('pt-BR')} · {i.operadorNome??'Operador não localizado'}</small></article>)}</div>
 {dados?.total===0&&<p className="sd-empty">Nenhum evento de assinatura registrado. Alterações anteriores à implantação deste histórico podem não estar disponíveis.</p>}
 {dados&&<footer className="sc-pagination"><span>{dados.total} registro(s) · Página {dados.pagina} de {paginas}</span><div className="sd-actions"><button className="sd-secondary" disabled={loading||dados.pagina<=1} onClick={()=>setPagina(dados.pagina-1)}>Anterior</button><button className="sd-secondary" disabled={loading||dados.pagina>=paginas} onClick={()=>setPagina(dados.pagina+1)}>Próxima</button></div></footer>}
 </section>;
}
