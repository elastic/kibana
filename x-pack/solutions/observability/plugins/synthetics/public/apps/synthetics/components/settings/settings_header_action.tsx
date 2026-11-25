/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import React, { createContext, useContext, useEffect } from 'react';

export type SettingsHeaderPrimaryAction = AppHeaderMenu['primaryActionItem'];

type RegisterSettingsHeaderAction = (item: SettingsHeaderPrimaryAction) => void;

const SettingsHeaderActionContext = createContext<RegisterSettingsHeaderAction | undefined>(
  undefined
);

export function SettingsHeaderActionProvider({
  register,
  children,
}: {
  register: RegisterSettingsHeaderAction;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <SettingsHeaderActionContext.Provider value={register}>
      {children}
    </SettingsHeaderActionContext.Provider>
  );
}

export function useHasSettingsHeaderAction(): boolean {
  return useContext(SettingsHeaderActionContext) !== undefined;
}

export function useRegisterSettingsHeaderAction(item: SettingsHeaderPrimaryAction): void {
  const register = useContext(SettingsHeaderActionContext);

  useEffect(() => {
    if (!register) {
      return;
    }
    register(item);
    return () => register(undefined);
  }, [item, register]);
}
