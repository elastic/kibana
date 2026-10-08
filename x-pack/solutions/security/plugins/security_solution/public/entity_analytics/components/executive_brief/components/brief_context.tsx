/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext } from 'react';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';

interface BriefContextValue {
  snapshot: BriefSnapshot;
}

const BriefContext = createContext<BriefContextValue | undefined>(undefined);

export const BriefContextProvider: React.FC<React.PropsWithChildren<BriefContextValue>> = ({
  snapshot,
  children,
}) => <BriefContext.Provider value={{ snapshot }}>{children}</BriefContext.Provider>;

export const useBriefSnapshot = (): BriefSnapshot => {
  const value = useContext(BriefContext);
  if (!value) {
    throw new Error('useBriefSnapshot must be used inside BriefContextProvider');
  }
  return value.snapshot;
};
