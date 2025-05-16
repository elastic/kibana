/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';

export interface IndicatorsFiltersContextValue {
  timeRange: TimeRange;
  filters: Filter[];
  filterQuery: Query;
  filterManager: FilterManager;
}

export const IndicatorsFiltersContext = createContext<IndicatorsFiltersContextValue | undefined>(
  undefined
);

/**
 * Hook to retrieve {@link IndicatorsFiltersContext} (contains FilterManager)
 */
export const useIndicatorsFiltersContext = (): IndicatorsFiltersContextValue => {
  const contextValue = useContext(IndicatorsFiltersContext);

  if (!contextValue) {
    throw new Error(
      'IndicatorsFiltersContext can only be used within IndicatorsFiltersContext provider'
    );
  }

  return contextValue;
};
