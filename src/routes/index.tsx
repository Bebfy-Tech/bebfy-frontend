import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { Login } from '../pages/Login';

const PDVPlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6">
    <h1 className="text-3xl font-bold text-bebfy-500 mb-2">PDV Bebfy em Construção</h1>
    <p className="text-gray-400">Login realizado com sucesso! Pronto para montar a tela do caixa.</p>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route path="/pdv" element={<PDVPlaceholder />} />
          <Route path="/" element={<Navigate to="/pdv" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/pdv" replace />} />
      </Routes>
    </BrowserRouter>
  );
};