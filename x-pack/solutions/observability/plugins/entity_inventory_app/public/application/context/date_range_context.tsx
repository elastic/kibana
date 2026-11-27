/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { TimeRange } from '@kbn/es-query';

interface EntityInventoryDateRangeContextValue {
  dateRange: TimeRange | undefined;
  setDateRange: (dateRange: TimeRange) => void;
}

const EntityInventoryDateRangeContext = createContext<EntityInventoryDateRangeContextValue | null>(
  null
);

export const EntityInventoryDateRangeProvider = ({ children }: { children: React.ReactNode }) => {
  const [dateRange, setState] = useState<TimeRange | undefined>();
  const setDateRange = useCallback(
    (next: TimeRange) => setState((previous) => (isEqual(previous, next) ? previous : next)),
    []
  );
  const value = useMemo(() => ({ dateRange, setDateRange }), [dateRange, setDateRange]);

  return (
    <EntityInventoryDateRangeContext.Provider value={value}>
      {children}
    </EntityInventoryDateRangeContext.Provider>
  );
};

export const useEntityInventoryDateRange = (): EntityInventoryDateRangeContextValue => {
  const context = useContext(EntityInventoryDateRangeContext);
  if (!context) {
    throw new Error(
      'useEntityInventoryDateRange must be used within an EntityInventoryDateRangeProvider'
    );
  }
  return context;
};
