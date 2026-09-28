/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { GraphFiltersState } from '../controls/apply_filters_popover';

export interface GraphFiltersContextValue {
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
}

const GraphFiltersContext = createContext<GraphFiltersContextValue | null>(null);

export const GraphFiltersProvider = ({
  filtersState,
  onFiltersChange,
  children,
}: PropsWithChildren<GraphFiltersContextValue>) => (
  <GraphFiltersContext.Provider value={{ filtersState, onFiltersChange }}>
    {children}
  </GraphFiltersContext.Provider>
);

/** Shared Display / Layers filter state for Controls + entity hover shortcut. */
export const useGraphFiltersContext = (): GraphFiltersContextValue | null =>
  useContext(GraphFiltersContext);
