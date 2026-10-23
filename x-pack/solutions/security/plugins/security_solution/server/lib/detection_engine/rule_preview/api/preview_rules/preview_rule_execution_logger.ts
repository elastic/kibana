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
  getErrors: () => string[];
  getWarnings: () => string[];
  reset: () => void;
}

export const createPreviewRuleExecutionLogger = (): IPreviewRuleExecutionLogger => {
  let errors: string[] = [];
  let warnings: string[] = [];
  let executionResult: ExecutionResult | undefined;

  return {
    factory: ({ context }) => {
      const spyLogger = {
        context,

        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: (message: string) => {
          warnings.push(message);
        },
        error: (message: string) => {
          errors.push(message);
        },
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
    getErrors: () => errors,
    getWarnings: () => warnings,
    // New arrays (not cleared ones) so logs already collected for previous invocations stay intact
    reset: () => {
      errors = [];
      warnings = [];
      executionResult = undefined;
    },
  };
};
