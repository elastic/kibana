/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ActiveFilter } from './data';

/**
 * Shares the Overview band’s active filter with the Entities table
 * (`useFetchGridData`) for client-side filtering.
 */
const FaceliftFilterContext = createContext<ActiveFilter | null>(null);

export const FaceliftFilterProvider: React.FC<{
  activeFilter: ActiveFilter | null;
  children: React.ReactNode;
}> = ({ activeFilter, children }) => (
  <FaceliftFilterContext.Provider value={activeFilter}>{children}</FaceliftFilterContext.Provider>
);

export const useFaceliftFilter = (): ActiveFilter | null => useContext(FaceliftFilterContext);
