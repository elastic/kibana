/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface SloDetailsContextType {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  isFlyout: boolean;
}

const SloDetailsContext = createContext<SloDetailsContextType | undefined>(undefined);

export function SloDetailsContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SloDetailsContextType;
}) {
  return <SloDetailsContext.Provider value={value}>{children}</SloDetailsContext.Provider>;
}

export function useSloDetailsContext(): SloDetailsContextType {
  const context = useContext(SloDetailsContext);
  if (context === undefined) {
    throw new Error('useSloDetailsContext must be used within a SloDetailsContextProvider');
  }
  return context;
}
