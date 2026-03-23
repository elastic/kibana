/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';

export interface TableSectionContext {
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

/**
 * A context provider for EASE alert summary table grouping component.
 * This allows group stats and renderers to not have to fetch packages.
 */
export const TableSectionContext = createContext<TableSectionContext | undefined>(undefined);

export type TableSectionContextProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & TableSectionContext;

export const TableSectionContextProvider = memo(
  ({ children, packages }: TableSectionContextProviderProps) => {
    const contextValue = useMemo(
      () => ({
        packages,
      }),
      [packages]
    );

    return (
      <TableSectionContext.Provider value={contextValue}>{children}</TableSectionContext.Provider>
    );
  }
);

TableSectionContextProvider.displayName = 'TableSectionContextProvider';

export const useTableSectionContext = (): TableSectionContext => {
  const contextValue = useContext(TableSectionContext);

  if (!contextValue) {
    throw new Error('TableSectionContext can only be used within TableSectionContext provider');
  }

  return contextValue;
};
