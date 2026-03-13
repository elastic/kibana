/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/alerts_schema';

export interface LegacyAlertsSloItem {
  id: string;
  instanceId: string;
  groupBy: string[];
  name: string;
}

interface SloItemOut {
  slo_id: string;
  slo_instance_id: string;
  name: string;
  group_by: string[];
}

/** Maps legacy camelCase slo item to current snake_case schema. */
function mapLegacySloItem(slo: Record<string, unknown>): SloItemOut {
  const rawGroupBy = (slo.group_by ?? slo.groupBy) as string[] | undefined;
  return {
    slo_id: (slo.slo_id as string) ?? (slo.id as string) ?? '',
    slo_instance_id: (slo.slo_instance_id as string) ?? (slo.instanceId as string) ?? '',
    name: (slo.name as string) ?? '',
    group_by: Array.isArray(rawGroupBy) ? rawGroupBy : [],
  };
}

export interface LegacyAlertsState {
  showAllGroupByInstances: boolean;
  slos: LegacyAlertsSloItem[];
}

/** Transforms SLO Alerts embeddable state for serialization. Migrates legacy camelCase to snake_case. */
export function transformAlertsOut(storedState: AlertsEmbeddableState): AlertsEmbeddableState {
  const state = storedState as AlertsEmbeddableState & {
    slos?: Array<Record<string, unknown>>;
    showAllGroupByInstances?: boolean;
  };
  const { showAllGroupByInstances: _legacy, ...rest } = state;
  const slos =
    state.slos?.map((slo) => {
      const hasLegacy = 'id' in slo || 'instanceId' in slo || 'groupBy' in slo;
      return hasLegacy ? mapLegacySloItem(slo) : (slo as SloItemOut);
    }) ?? [];
  const showAllGroupByInstances =
    state.show_all_group_by_instances ?? state.showAllGroupByInstances ?? false;
  return { ...rest, slos, show_all_group_by_instances: showAllGroupByInstances };
}
