/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

export interface TableSectionContext {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Result from the useQuery to fetch all rules
   */
  ruleResponse: {
    /**
     * Result from fetching all rules
     */
    rules: RuleResponse[];
    /**
     * True while rules are being fetched
     */
    isLoading: boolean;
  };
}

/**
 * A context provider for the AI for SOC alert summary table grouping component.
 * This allows group stats and renderers to not have to fetch rules and packages.
 */
export const TableSectionContext = createContext<TableSectionContext | undefined>(undefined);

export type TableSectionContextProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & TableSectionContext;

export const TableSectionContextProvider = memo(
  ({ children, packages, ruleResponse }: TableSectionContextProviderProps) => {
    const contextValue = useMemo(
      () => ({
        packages,
        ruleResponse,
      }),
      [packages, ruleResponse]
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
