export type Cargo = 
  | 'ADMINISTRADOR'
  | 'FUNCIONARIO'
  | 'PROPRIETARIO'
  | 'GERENTE'
  | 'OPERADOR_CAIXA'
  | 'ESTOQUISTA'
  | 'ENTREGADOR';

export interface Usuario {
  id: string;
  codigo: number;
  nome: string;
  cargo: Cargo;
  funcionarioId: string;
  permissoes?: string[];
}

export interface Empresa {
  id: number;
  nomeFantasia: string;
  subdominio: string;
}

export interface AuthResponse {
  access_token: string;
  empresa: Empresa;
  usuario: Usuario;
}

export interface LoginCredentials {
  login: string;
  senha: string;
  assumirSessao?: boolean;
}

export interface PrimeiroAcessoResponse {
  trocaSenhaObrigatoria: true;
  tokenTroca: string;
}

export type LoginResponse = AuthResponse | PrimeiroAcessoResponse;

export interface TrocaSenhaPrimeiroAcesso {
  tokenTroca: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

export interface ValidarGerenteDto {
  login: string;
  senha: string;
}

export interface ValidarGerenteResponse {
  autorizado: boolean;
  gerenteId: string;
  codigoGerente: number | null;
  nomeGerente: string;
}