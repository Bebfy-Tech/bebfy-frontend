import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TenantModules } from '../services/moduleAccess';
import { api, getTenantSlug } from '../services/api';
import type {
  AuthResponse, LoginCredentials, LoginResponse, Usuario, Empresa,
  ValidarGerenteDto, ValidarGerenteResponse, TrocaSenhaPrimeiroAcesso,
} from '../types/auth';

interface AuthContextData {
  user: Usuario | null;
  empresa: Empresa | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  modules: TenantModules;
  modulesStatus: 'loading' | 'ready' | 'error';
  refreshModules: () => Promise<void>;
  login: (credentials: LoginCredentials, tenantSlug?: string) => Promise<LoginResponse>;
  finalizarPrimeiroAcesso: (dados: TrocaSenhaPrimeiroAcesso) => Promise<void>;
  logout: () => void;
  validarGerente: (credentials: ValidarGerenteDto) => Promise<ValidarGerenteResponse>;
}
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<TenantModules>({});
  const [modulesStatus, setModulesStatus] = useState<'loading'|'ready'|'error'>('loading');
  const refreshModules = useCallback(async () => {
    if (!localStorage.getItem('@Bebfy:token')) return;
    try {
      const response = await api.get<{modulos:TenantModules}>('/auth/modulos');
      setModules(response.data.modulos || {});
      setModulesStatus('ready');
    } catch {
      // On a failed initial request do not assume paid modules are available.
      setModulesStatus(previous => previous === 'ready' ? previous : 'error');
    }
  }, []);

  const limpar = () => {
    localStorage.removeItem('@Bebfy:token');
    localStorage.removeItem('@Bebfy:user');
    localStorage.removeItem('@Bebfy:empresa');
    localStorage.removeItem('@Bebfy:tenantOverride');
    setToken(null); setUser(null); setEmpresa(null); setModules({}); setModulesStatus('loading');
  };

  const guardar = (resposta: AuthResponse) => {
    localStorage.setItem('@Bebfy:token', resposta.access_token);
    localStorage.setItem('@Bebfy:user', JSON.stringify(resposta.usuario));
    localStorage.setItem('@Bebfy:empresa', JSON.stringify(resposta.empresa));
    setToken(resposta.access_token);
    setUser(resposta.usuario);
    setEmpresa(resposta.empresa);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('@Bebfy:token');
    const storedUser = localStorage.getItem('@Bebfy:user');
    const storedEmpresa = localStorage.getItem('@Bebfy:empresa');
    if (!storedToken || !storedUser || !storedEmpresa) { setLoading(false); return; }
    // A session saved for one store must never be restored in another store.
    try {
      const savedEmpresa = JSON.parse(storedEmpresa) as Empresa;
      const currentTenant = getTenantSlug();
      if (currentTenant && savedEmpresa.subdominio?.toLowerCase() !== currentTenant) {
        limpar();
        setLoading(false);
        return;
      }
    } catch {
      limpar();
      setLoading(false);
      return;
    }
    // Do not trust persisted JWT before server validates its current active session ID.
    void api.get('/auth/perfil')
      .then(() => {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as Usuario);
          setEmpresa(JSON.parse(storedEmpresa) as Empresa);
        } catch { limpar(); }
      })
      .catch(() => limpar())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    setModulesStatus('loading');
    void refreshModules();
    const interval = window.setInterval(() => { void refreshModules(); }, 15000);
    const onFocus = () => { if (!document.hidden) void refreshModules(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, refreshModules]);

  const login = async (credentials: LoginCredentials, tenantSlug?: string): Promise<LoginResponse> => {
    if (tenantSlug) {
      const normalized = tenantSlug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
        throw new Error('Subdomínio da empresa inválido.');
      }
      localStorage.setItem('@Bebfy:tenantOverride', normalized);
    }
    if (!getTenantSlug()) throw new Error('Loja não identificada. Informe o subdomínio.');
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials);
      if ('trocaSenhaObrigatoria' in data) return data;
      guardar(data);
      return data;
    } catch (error) {
      // Keep tenant only when login is working, not after a rejected attempt.
      if (tenantSlug) localStorage.removeItem('@Bebfy:tenantOverride');
      throw error;
    }
  };

  const finalizarPrimeiroAcesso = async (dados: TrocaSenhaPrimeiroAcesso) => {
    const { data } = await api.post<AuthResponse>('/auth/primeiro-acesso/alterar-senha', dados);
    guardar(data);
  };

  useEffect(() => {
    if (!token) return;
    const checar = () => { void api.get('/auth/perfil').catch(() => limpar()); };
    // Ensures a displaced terminal is returned to login even when idle.
    const intervalo = window.setInterval(checar, 15000);
    const aoVoltar = () => { if (!document.hidden) checar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [token]);

  const logout = () => {
    const sessao = localStorage.getItem('@Bebfy:token');
    const slug = getTenantSlug();
    if (sessao) {
      void api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${sessao}`, 'x-tenant': slug },
      }).catch(() => {});
    }
    limpar();
  };

  const validarGerente = async (credentials: ValidarGerenteDto): Promise<ValidarGerenteResponse> => {
    const { data } = await api.post<ValidarGerenteResponse>('/auth/validar-gerente', credentials);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user, empresa, token, isAuthenticated: !!token,
      loading, modules, modulesStatus, refreshModules, login, finalizarPrimeiroAcesso, logout, validarGerente,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
