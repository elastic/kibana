/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorBudgetEmbeddableState } from '../../../../server/lib/embeddables/error_budget_schema';

export interface LegacyErrorBudgetState {
  sloId: string;
  sloInstanceId?: string;
}

/**
 * Converts pre 9.4 error budget camelCase state to snake_case state.
 */
export function transformErrorBudgetOut(
  storedState: ErrorBudgetEmbeddableState
): ErrorBudgetEmbeddableState {
  const {
    sloId: legacySloId,
    sloInstanceId: legacySloInstanceId,
    ...state
  } = storedState as ErrorBudgetEmbeddableState & LegacyErrorBudgetState;

  const sloId = state.slo_id ?? legacySloId;
  const sloInstanceId = state.slo_instance_id ?? legacySloInstanceId;

  return {
    ...state,
    ...(sloId ? { slo_id: sloId } : {}),
    ...(sloInstanceId ? { slo_instance_id: sloInstanceId } : {}),
  };
}
