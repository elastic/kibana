/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useContext } from 'react';
import type { AppMountParameters, ThemeServiceStart, UserProfileService } from '@kbn/core/public';

interface ContextProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  userProfile: UserProfileService;
  theme: ThemeServiceStart;
}

export const HeaderActionMenuContext = React.createContext<ContextProps | null>(null);

export const HeaderActionMenuProvider: React.FC<PropsWithChildren<Required<ContextProps>>> = ({
  setHeaderActionMenu,
  theme,
  userProfile,
  children,
}) => {
  return (
    <HeaderActionMenuContext.Provider value={{ setHeaderActionMenu, theme, userProfile }}>
      {children}
    </HeaderActionMenuContext.Provider>
  );
};

export const useHeaderActionMenu = () => {
  // TODO: throw error if context is null?
  return useContext(HeaderActionMenuContext);
};
