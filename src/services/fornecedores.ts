import { api } from './api';
export type Pessoa='FISICA'|'JURIDICA';
export type FornecedorDraft={tipoPessoa:Pessoa;cnpj:string;razaoSocial:string;nomeFantasia:string|null;inscricaoEstadual:string|null;telefone:string|null;email:string|null;endereco:string|null;contatoComercial:string|null;cep:string|null;cidade:string|null;uf:string|null;segmento:string|null;observacao:string|null;ativo:boolean};
export type Fornecedor=FornecedorDraft&{id:string;codigoFornecedor:number;criadoEm:string;atualizadoEm:string;saldoPendente?:string|number|null;notasMes?:string|number|null;_count?:{notasFiscais:number}};
export type NotaFornecedor={id:string;numeroNota:string;chaveAcesso:string;dataEmissao:string;criadoEm:string;valorTotal:string|number;itens:{quantidade:number;valorUnitario:string|number;produto:{id:number;nome:string}}[]};
export type ContaFornecedor={id:string;descricao:string;categoria:string;valor:string|number;valorBaixado:string|number;status:'PENDENTE'|'PAGO'|'CANCELADO';dataVencimento:string;notaFiscalId:string|null};
export type FichaFornecedor={fornecedor:Fornecedor;notas:NotaFornecedor[];contasPagar:ContaFornecedor[]|null;saldoPendente:string|number|null};
const root='/fornecedores';
export const fornecedoresApi={
 listar:()=>api.get<Fornecedor[]>(root+'/gestao').then(r=>r.data),
 ficha:(id:string)=>api.get<FichaFornecedor>(root+'/'+encodeURIComponent(id)+'/ficha').then(r=>r.data),
 criar:(d:FornecedorDraft)=>api.post<Fornecedor>(root,d).then(r=>r.data),
 editar:(id:string,d:Partial<FornecedorDraft>)=>api.patch<Fornecedor>(root+'/'+encodeURIComponent(id),d).then(r=>r.data),
 situacao:(id:string,ativo:boolean)=>api.patch(root+'/'+encodeURIComponent(id)+'/situacao',{ativo})
};
export const normalizarDocumento=(s:string)=>s.toUpperCase().replace(/[.\s/-]/g,'');
export function formatarDocumento(s:string,t:Pessoa){
 const d=normalizarDocumento(s);
 return t==='FISICA'?d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3}\.\d{3})(\d)/,'$1.$2').replace(/(\.\d{3})(\d)/,'$1-$2'):d.replace(/^(.{2})(.)/,'$1.$2').replace(/^(.{2}\..{3})(.)/,'$1.$2').replace(/(\..{3})(.)/,'$1/$2').replace(/(\/.{4})(.)/,'$1-$2');
}
export function draftFornecedor(f?:Fornecedor):FornecedorDraft{return {tipoPessoa:f?.tipoPessoa??'JURIDICA',cnpj:f?.cnpj??'',razaoSocial:f?.razaoSocial??'',nomeFantasia:f?.nomeFantasia??null,inscricaoEstadual:f?.inscricaoEstadual??null,telefone:f?.telefone??null,email:f?.email??null,endereco:f?.endereco??null,contatoComercial:f?.contatoComercial??null,cep:f?.cep??null,cidade:f?.cidade??null,uf:f?.uf??null,segmento:f?.segmento??null,observacao:f?.observacao??null,ativo:f?.ativo??true};}
