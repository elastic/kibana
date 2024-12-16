/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { createContext } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { mockCoreStart } from '../../mocks/context';

const navigationContext = createContext<CoreStart | null>(mockCoreStart);

export const NavigationProvider: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <navigationContext.Provider value={mockCoreStart}>{children}</navigationContext.Provider>
);

export const useNavigationContext = (): CoreStart => {
  return mockCoreStart;
};
