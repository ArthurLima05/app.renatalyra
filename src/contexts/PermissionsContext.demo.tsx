import React from 'react';
import { PermissionsContext, PermissionsContextType } from './base/permissionsContextBase';

// Na demonstração o usuário fictício é sempre admin: acesso total a todos os módulos.
export const DemoPermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const value: PermissionsContextType = {
    isAdmin: true,
    loading: false,
    canView: () => true,
    canCreate: () => true,
    canEdit: () => true,
    canDelete: () => true,
    hasAnyPermission: () => true,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};
