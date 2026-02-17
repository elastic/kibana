/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyBurnRateEmbeddableState } from '../schema';
import type { BurnRateEmbeddableState } from '../../../../server/lib/embeddables/schema';
import type { BurnRateCustomState } from '../schema';

type StoredStateWithLegacy = Partial<BurnRateCustomState> &
  Partial<LegacyBurnRateEmbeddableState>;

export const getTransforms = () => ({
  transformOut: (storedState: BurnRateEmbeddableState) => {
    const state = storedState as StoredStateWithLegacy & Record<string, unknown>;

    // Check if this is legacy format (has camelCase fields)
    const hasLegacyFields = 'sloId' in state || 'sloInstanceId' in state;

    if (hasLegacyFields) {
      // Convert legacy camelCase to snake_case, preserving other fields
      const legacyFields = ['sloId', 'sloInstanceId'];
      const rest = Object.fromEntries(
        Object.entries(state).filter(([key]) => !legacyFields.includes(key))
      );
      return {
        ...rest,
        slo_id: state.slo_id ?? (state.sloId as string | undefined),
        slo_instance_id: state.slo_instance_id ?? (state.sloInstanceId as string | undefined),
        duration: state.duration as string,
      };
    }

    // Already in new format - return as is
    return storedState;
  },
});
