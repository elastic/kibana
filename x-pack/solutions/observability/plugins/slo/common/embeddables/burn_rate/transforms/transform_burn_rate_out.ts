/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BurnRateEmbeddableState } from '../types';

export interface LegacyBurnRateState {
  sloId: string;
  sloInstanceId?: string;
}

/**
 * Converts pre 9.4 burn rate camelCase state to snake_case state.
 */
export function transformBurnRateOut(
  storedState: BurnRateEmbeddableState
): BurnRateEmbeddableState {
  const {
    sloId: legacySloId,
    sloInstanceId: legacySloInstanceId,
    ...state
  } = storedState as BurnRateEmbeddableState & LegacyBurnRateState;

  const sloId = state.slo_id ?? legacySloId;
  const sloInstanceId = state.slo_instance_id ?? legacySloInstanceId;

  return {
    ...state,
    ...(sloId ? { slo_id: sloId } : {}),
    ...(sloInstanceId ? { slo_instance_id: sloInstanceId } : {}),
  };
}
