/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorBudget } from '../../domain/models';

export function createErrorBudget(params: Partial<ErrorBudget> = {}): ErrorBudget {
  return {
    initial: 0.05,
    consumed: 0.1,
    remaining: 0.9,
    isEstimated: false,
    ...params,
  };
}
