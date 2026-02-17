/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyAlertsEmbeddableState } from '../schema';
import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/schema';
import type { AlertsCustomState } from '../schema';

type StoredStateWithLegacy = Partial<AlertsCustomState> &
  Partial<LegacyAlertsEmbeddableState>;

export const getTransforms = () => ({
  transformOut: (storedState: AlertsEmbeddableState) => {
    const state = storedState as StoredStateWithLegacy & Record<string, unknown>;

    // Check if this is legacy format (has camelCase fields)
    const hasLegacyFields =
      (Array.isArray(state.slos) &&
        state.slos.some(
          (slo: unknown) =>
            typeof slo === 'object' &&
            slo !== null &&
            ('instanceId' in slo || 'groupBy' in slo)
        )) ||
      'showAllGroupByInstances' in state;

    if (hasLegacyFields) {
      // Convert legacy camelCase to snake_case, preserving other fields
      const legacyFields = ['slos', 'showAllGroupByInstances'];
      const rest = Object.fromEntries(
        Object.entries(state).filter(([key]) => !legacyFields.includes(key))
      );

      const convertedSlos = Array.isArray(state.slos)
        ? (state.slos as Array<Record<string, unknown>>).map((slo) => {
            // Ensure group_by is always a string (it might come as an array from SLO data)
            const groupByValue = slo.group_by ?? slo.groupBy;
            const groupByString =
              typeof groupByValue === 'string'
                ? groupByValue
                : Array.isArray(groupByValue)
                ? groupByValue.join(',')
                : '';
            return {
              id: slo.id as string,
              instance_id: slo.instance_id ?? (slo.instanceId as string | undefined),
              name: slo.name as string,
              group_by: groupByString,
            };
          })
        : [];

      return {
        ...rest,
        slos: convertedSlos,
        show_all_group_by_instances:
          state.show_all_group_by_instances ??
          (state.showAllGroupByInstances as boolean | undefined),
      };
    }

    // Already in new format - return as is
    return storedState;
  },
});
