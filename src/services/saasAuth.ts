import axios from 'axios';

export interface SaasUser {
  id: string;
  codigo: number;
  nome: string;
  email?: string | null;
  cargo: 'SUPER_ADMIN' | 'OPERADOR';
  permissoes: string[];
  ativo: boolean;
}
export interface SaasFuncionario extends SaasUser { criadoEm?: string; }
export const saasClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});
saasClient.interceptors.request.use(config => {
  const token = localStorage.getItem('@Bebfy:saasToken');
  if (token) config.headers.set('Authorization', 'Bearer ' + token);
  return config;
});
export const saasAuthApi = {
  login: (codigo: number, senha: string) => saasClient.post<{access_token:string;usuario:SaasUser}>('/saas/auth/login',{codigo,senha}).then(r=>r.data),
  perfil: () => saasClient.get<SaasUser>('/saas/auth/perfil').then(r=>r.data),
  logout: () => saasClient.post('/saas/auth/logout').then(r=>r.data),
  atualizarPerfil: (data: {nome?:string;email?:string;senhaAtual?:string;novaSenha?:string}) =>
    saasClient.patch<SaasUser>('/saas/auth/perfil',data).then(r=>r.data),
  funcionarios: () => saasClient.get<SaasFuncionario[]>('/saas/admin/funcionarios').then(r=>r.data),
  criarFuncionario: (data:{codigo:number;nome:string;senha:string;cargo:'OPERADOR';permissoes:string[]}) => saasClient.post('/saas/admin/funcionarios',data).then(r=>r.data),
  alterarFuncionario: (id:string,data:{codigo?:number;ativo?:boolean;permissoes?:string[];nome?:string;email?:string|null;senha?:string}) => saasClient.patch('/saas/admin/funcionarios/'+id,data).then(r=>r.data),
};
