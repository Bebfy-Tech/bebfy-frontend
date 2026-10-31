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
}

export interface ValidarGerenteDto {
  login: string;
  senha: string;
}

export interface ValidarGerenteResponse {
  valido: boolean;
  gerente: {
    id: string;
    nome: string;
    cargo: Cargo;
  };
}