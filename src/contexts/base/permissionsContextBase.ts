import { createContext, useContext } from 'react';

export interface PermissionsContextType {
  isAdmin: boolean;
  loading: boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
}

export const PermissionsContext = createContext<PermissionsContextType>({
  isAdmin: false,
  loading: true,
  canView: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  hasAnyPermission: () => false,
});

export const usePermissionsCtx = () => useContext(PermissionsContext);
