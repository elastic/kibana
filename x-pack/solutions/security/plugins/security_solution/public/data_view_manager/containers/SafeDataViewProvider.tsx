/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  type ReactNode,
  type FC,
  type PropsWithChildren,
  useMemo,
} from 'react';

import { type DataViewManagerScopeName } from '../constants';
import { useDataView } from '../hooks/use_data_view';

export interface DataViewContextValue {
  readonly results: Record<string, ReturnType<typeof useDataView>>;
}

export const DataViewContext = createContext<DataViewContextValue | undefined>(undefined);

export interface SafeDataViewProviderProps {
  scopes: readonly DataViewManagerScopeName[];
  fallback?: ReactNode;
}

const fallbackElement = <div>{`WIP Loading`}</div>;

/**
 * Data view provider. We call it safe, because obtaining data view instance (for specified scopes) inside of it
 * does not require addtional checks for nullish value or loading state.
 */
export const SafeDataViewProvider: FC<PropsWithChildren<SafeDataViewProviderProps>> = ({
  children,
  scopes,
  fallback = fallbackElement,
}) => {
  const results = scopes.map(useDataView);
  const allReady = Object.values(results).every((result) => result.status === 'ready');
  const dataViews = Object.values(results).map((result) => result.dataView);

  const value = useMemo(() => {
    return results.reduce(
      (acc, result) => {
        acc.results[result.scope] = result;
        return acc;
      },
      { results: {} } as DataViewContextValue
    );
    // NOTE: below is done on purpose to cache based on the data view instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dataViews]);

  return (
    <DataViewContext.Provider value={value}>
      {allReady ? children : fallback}
    </DataViewContext.Provider>
  );
};
