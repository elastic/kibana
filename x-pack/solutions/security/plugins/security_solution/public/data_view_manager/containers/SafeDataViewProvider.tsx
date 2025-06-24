/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, type ReactNode, type FC, type PropsWithChildren } from 'react';

import { type DataViewManagerScopeName } from '../constants';
import { useDataView } from '../hooks/use_data_view';

export const DataViewContext = createContext<
  | { results: Array<ReturnType<typeof useDataView>>; scopes: readonly DataViewManagerScopeName[] }
  | undefined
>(undefined);

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
  const allReady = results.every((result) => result.status === 'ready');

  return (
    <DataViewContext.Provider value={{ results, scopes }}>
      {allReady ? children : fallback}
    </DataViewContext.Provider>
  );
};
