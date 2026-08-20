/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import React, { createContext, useContext } from 'react';

const AlertWorkflowExecutorContext = createContext<RunWorkflowExecutor | undefined>(undefined);

export interface AlertWorkflowExecutorProviderProps {
  children: React.ReactNode;
  runWorkflow: RunWorkflowExecutor;
}

/** Supplies an embedding surface's workflow executor to alert actions rendered below it. */
export const AlertWorkflowExecutorProvider: React.FC<AlertWorkflowExecutorProviderProps> = ({
  children,
  runWorkflow,
}) => (
  <AlertWorkflowExecutorContext.Provider value={runWorkflow}>
    {children}
  </AlertWorkflowExecutorContext.Provider>
);

export const useAlertWorkflowExecutor = (): RunWorkflowExecutor | undefined =>
  useContext(AlertWorkflowExecutorContext);
