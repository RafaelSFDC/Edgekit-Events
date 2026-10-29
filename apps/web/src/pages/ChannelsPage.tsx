import React from 'react';
import { Navigate } from '@tanstack/react-router';

/**
 * A rota /channels foi unificada dentro do Console de Eventos (/console?tab=channels).
 * Este componente redireciona transparentemente para a nova aba integrada.
 */
export const ChannelsPage: React.FC = () => {
  return <Navigate to="/console" search={{ tab: 'channels' } as any} replace />;
};
