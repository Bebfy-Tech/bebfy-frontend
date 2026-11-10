import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SaasAuthProvider } from './contexts/SaasAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SaasAuthProvider><AppRoutes /></SaasAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;