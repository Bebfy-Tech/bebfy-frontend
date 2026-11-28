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
export interface SaasFuncionario extends SaasUser { criadoEm?: string; atualizadoEm?:string; }
export const SAAS_TOKEN_KEY='@Bebfy:saasToken';
export const SAAS_SESSION_EVENT='bebfy:saas-session-invalid';
export const saasClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});
saasClient.interceptors.request.use(config => {
  const token = localStorage.getItem(SAAS_TOKEN_KEY);
  if (token && config.url!=='/saas/auth/login' && !config.headers.has('Authorization')) config.headers.set('Authorization', 'Bearer ' + token);
  return config;
});
// A delayed 401 from an old request must not invalidate a newly authenticated session.
saasClient.interceptors.response.use(r=>r,error=>{
  if(axios.isAxiosError(error)&&error.response?.status===401&&error.config?.url!=='/saas/auth/login'){
    const token=localStorage.getItem(SAAS_TOKEN_KEY);
    const sent=error.config?.headers?.get?.('Authorization');
    if(token&&sent==='Bearer '+token){
      localStorage.removeItem(SAAS_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent(SAAS_SESSION_EVENT,{detail:'Sessão expirada ou revogada. Entre novamente.'}));
    }
  }
  return Promise.reject(error);
});
export const saasAuthApi = {
  login: (codigo: number, senha: string) => saasClient.post<{access_token:string;usuario:SaasUser}>('/saas/auth/login',{codigo,senha}).then(r=>r.data),
  perfil: () => saasClient.get<SaasUser>('/saas/auth/perfil').then(r=>r.data),
  logout: () => {const token=localStorage.getItem(SAAS_TOKEN_KEY);return token?saasClient.post('/saas/auth/logout',undefined,{headers:{Authorization:'Bearer '+token}}).then(r=>r.data):Promise.resolve();},
  atualizarPerfil: (data: {nome?:string;email?:string|null;senhaAtual?:string;novaSenha?:string}) =>
    saasClient.patch<SaasUser>('/saas/auth/perfil',data).then(r=>r.data),
  funcionarios: () => saasClient.get<SaasFuncionario[]>('/saas/admin/funcionarios').then(r=>r.data),
  criarFuncionario: (data:{codigo:number;nome:string;email?:string;senha:string;cargo:'OPERADOR';permissoes:string[]}) => saasClient.post('/saas/admin/funcionarios',data).then(r=>r.data),
  encerrarSessao: (id:string)=>saasClient.post<{encerrada:boolean}>('/saas/admin/funcionarios/'+id+'/encerrar-sessao').then(r=>r.data),
  alterarFuncionario: (id:string,data:{codigo?:number;ativo?:boolean;permissoes?:string[];nome?:string;email?:string|null;senha?:string}) => saasClient.patch('/saas/admin/funcionarios/'+id,data).then(r=>r.data),
};
