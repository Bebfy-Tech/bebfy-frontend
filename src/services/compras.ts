import { api } from './api';
export type StatusCompra='RASCUNHO'|'AGUARDANDO'|'PARCIAL'|'RECEBIDA'|'CANCELADA'|'ENCERRADA_PARCIAL';
export const statusCompra:Record<StatusCompra,string>={RASCUNHO:'Rascunho',AGUARDANDO:'Aguardando entrega',PARCIAL:'Recebida parcialmente',RECEBIDA:'Recebida',CANCELADA:'Cancelada',ENCERRADA_PARCIAL:'Encerrada parcialmente'};
type Valor=string|number;
export type ProdutoCompra={id:number;nome:string;codigoBarras:string|null;estoqueAtual:number;estoqueMinimo:number;unidadeMedida:string;unidadeEmbalagemSigla:string|null;fardoQuantidade:number|null;precoCusto:Valor;precoVendaVarejo:Valor};
export type ReferenciasCompra={fornecedores:{id:string;razaoSocial:string;nomeFantasia:string|null}[];produtos:ProdutoCompra[]};
export type ItemPedido={produtoId:number;modo:'BASE'|'EMBALAGEM';quantidade:number;custoEmbalagem:number};
export type NovoPedido={fornecedorId:string;previsaoEntrega?:string;observacao?:string;frete:number;desconto:number;itens:ItemPedido[];chaveOperacao:string};
export type ItemCompra={id:string;produtoId:number;produtoNome:string;unidadeBase:string;unidadeCompra:string;fator:number;quantidade:number;unidades:number;unidadesRecebidas:number;custoEmbalagem:Valor;subtotal:Valor;total:Valor};
export type Recebimento={id:string;total:Valor;criadoEm:string;observacao:string;operadorId:string;chaveNfe:string|null;itens:{id:string;itemCompraId:string;unidades:number;valor:Valor;estoqueAnterior:number;estoquePosterior:number;custoAnterior:Valor;custoNovo:Valor;custoUnitario:Valor;lote:{numeroLote:string|null;dataVencimento:string|null}|null}[];contasPagar:{id:string;descricao:string;valor:Valor;status:string;dataVencimento:string}[]};
export type Compra={id:string;codigoCompra:number;fornecedorId:string;fornecedorNome:string;status:StatusCompra;criadoEm:string;previsaoEntrega:string|null;observacao:string|null;subtotal:Valor;frete:Valor;desconto:Valor;total:Valor;motivoEncerramento:string|null;itens:ItemCompra[];recebimentos:Recebimento[]};
export type NovoRecebimento={itens:{itemCompraId:string;unidades:number;numeroLote?:string;validade?:string}[];chaveNfe?:string;observacao:string;gerarContaPagar:boolean;vencimento?:string;parcelas?:number;chaveOperacao:string};
const root='/compras';
const url=(id:string)=>root+'/'+encodeURIComponent(id);
export const comprasApi={
 listar:()=>api.get<Compra[]>(root).then(r=>r.data),
 referencias:()=>api.get<ReferenciasCompra>(root+'/referencias').then(r=>r.data),
 ficha:(id:string)=>api.get<Compra>(url(id)).then(r=>r.data),
 criar:(dto:NovoPedido)=>api.post<Compra>(root,dto).then(r=>r.data),
 confirmar:(id:string)=>api.post<Compra>(url(id)+'/confirmar').then(r=>r.data),
 encerrar:(id:string,motivo:string)=>api.post<Compra>(url(id)+'/encerrar',{motivo}).then(r=>r.data),
 receber:(id:string,dto:NovoRecebimento)=>api.post<Compra>(url(id)+'/receber',dto).then(r=>r.data)
};
export const centavos=(v:unknown)=>Math.round(Number(v||0)*100);
export const recebido=(c:Compra)=>c.recebimentos.reduce((a,r)=>a+centavos(r.total),0)/100;
export const saldoItem=(i:ItemCompra)=>i.unidades-i.unidadesRecebidas;
export const valorParcial=(i:ItemCompra,q:number)=>(Math.round(centavos(i.total)*(i.unidadesRecebidas+q)/i.unidades)-Math.round(centavos(i.total)*i.unidadesRecebidas/i.unidades))/100;
export const dataCompra=(v:string|null|undefined)=>v?v.slice(0,10).split('-').reverse().join('/'):'—';
