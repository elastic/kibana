/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionContext } from '@kbn/workflows';
import React, { createContext, useContext } from 'react';

export interface AlertWorkflowExecutionTarget {
  _id: string;
  _index: string;
}

export type ResolveAlertWorkflowExecutionContext = (
  alerts: AlertWorkflowExecutionTarget[]
) => WorkflowExecutionContext | undefined;

const AlertWorkflowExecutionContextResolverContext = createContext<
  ResolveAlertWorkflowExecutionContext | undefined
>(undefined);

export interface AlertWorkflowExecutionContextProviderProps {
  children: React.ReactNode;
  resolveExecutionContext: ResolveAlertWorkflowExecutionContext;
}

/**
 * Supplies product-owned workflow execution contexts to alert actions rendered below it.
 */
export const AlertWorkflowExecutionContextProvider: React.FC<
  AlertWorkflowExecutionContextProviderProps
> = ({ children, resolveExecutionContext }) => (
  <AlertWorkflowExecutionContextResolverContext.Provider value={resolveExecutionContext}>
    {children}
  </AlertWorkflowExecutionContextResolverContext.Provider>
);

export const useResolveAlertWorkflowExecutionContext = ():
  | ResolveAlertWorkflowExecutionContext
  | undefined => useContext(AlertWorkflowExecutionContextResolverContext);
