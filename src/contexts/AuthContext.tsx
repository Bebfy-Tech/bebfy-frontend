import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getTenantSlug } from '../services/api';

// Adicionada a palavra-chave 'type' antes das chaves para respeitar o verbatimModuleSyntax
import type {
  AuthResponse,
  LoginCredentials,
  Usuario,
  Empresa,
  ValidarGerenteDto,
  ValidarGerenteResponse,
} from '../types/auth';

interface AuthContextData {
  user: Usuario | null;
  empresa: Empresa | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  validarGerente: (credentials: ValidarGerenteDto) => Promise<ValidarGerenteResponse>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega a sessão guardada no localStorage ao inicializar o app
  useEffect(() => {
    const storedToken = localStorage.getItem('@Bebfy:token');
    const storedUser = localStorage.getItem('@Bebfy:user');
    const storedEmpresa = localStorage.getItem('@Bebfy:empresa');

    if (storedToken && storedUser && storedEmpresa) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setEmpresa(JSON.parse(storedEmpresa));
      void api.get('/auth/perfil').catch(() => {
        // The interceptor expires rejected sessions and returns to login.
      });
    }
    setLoading(false);
  }, []);

  // Efetua o login do operador na API NestJS
  const login = async (credentials: LoginCredentials) => {
    if (!getTenantSlug()) {
      throw new Error('Loja não identificada. Configure VITE_TENANT_SLUG antes de acessar o Bebfy.');
    }
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { access_token, usuario, empresa: empresaData } = response.data;

    // Guarda os dados no localStorage para manter a sessão ativa
    localStorage.setItem('@Bebfy:token', access_token);
    localStorage.setItem('@Bebfy:user', JSON.stringify(usuario));
    localStorage.setItem('@Bebfy:empresa', JSON.stringify(empresaData));

    setToken(access_token);
    setUser(usuario);
    setEmpresa(empresaData);
  };

  // Liberação de alçada de gerente no PDV
  const validarGerente = async (credentials: ValidarGerenteDto): Promise<ValidarGerenteResponse> => {
    const response = await api.post<ValidarGerenteResponse>('/auth/validar-gerente', credentials);
    return response.data;
  };

  // Limpa os dados de autenticação ao sair
  const logout = () => {
    localStorage.removeItem('@Bebfy:token');
    localStorage.removeItem('@Bebfy:user');
    localStorage.removeItem('@Bebfy:empresa');
    setToken(null);
    setUser(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        empresa,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        validarGerente,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);