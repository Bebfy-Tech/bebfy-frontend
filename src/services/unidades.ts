import { api } from './api';
export const tiposUnidade={CONTAGEM:'Contagem',EMBALAGEM:'Embalagem',PESO:'Peso',VOLUME:'Volume',OUTROS:'Outros'} as const;
export type TipoUnidade=keyof typeof tiposUnidade;
export type UnidadeDraft={sigla:string;descricao:string;tipo:TipoUnidade;ativo:boolean};
export type Unidade=UnidadeDraft&{id:string;_count?:{produtosBase:number;produtosEmbalagem:number}};
const root='/unidades-medida';
export const unidadesApi={
 listar:()=>api.get<Unidade[]>(root).then(r=>r.data),
 criar:(d:UnidadeDraft)=>api.post(root,d),
 editar:(id:string,d:UnidadeDraft)=>api.patch(root+'/'+encodeURIComponent(id),d),
 situacao:(id:string,ativo:boolean)=>api.patch(root+'/'+encodeURIComponent(id)+'/situacao',{ativo}),
 excluir:(id:string)=>api.delete(root+'/'+encodeURIComponent(id))
};
export const usosUnidade=(u:Unidade)=>(u._count?.produtosBase??0)+(u._count?.produtosEmbalagem??0);
