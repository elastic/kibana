/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionResult, IRuleMonitoringService } from '../../../rule_monitoring';

export interface IPreviewRuleExecutionLogger {
  factory: IRuleMonitoringService['createRuleExecutionLogClientForExecutors'];
  getExecutionResult: () => ExecutionResult | undefined;
}

export const createPreviewRuleExecutionLogger = (): IPreviewRuleExecutionLogger => {
  let executionResult: ExecutionResult | undefined;

  return {
    factory: ({ context }) => {
      const spyLogger = {
        context,

        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        logMetric: () => {},
        logMetrics: () => {},
        logExecutionResult: (result: ExecutionResult): void => {
          executionResult = result;
        },

        closed: () => false,
        close: () => Promise.resolve(),
      };

      return Promise.resolve(spyLogger);
    },
    getExecutionResult: () => {
      return executionResult;
    },
  };
};
