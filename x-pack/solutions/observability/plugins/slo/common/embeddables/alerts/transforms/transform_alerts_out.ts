/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import type {
  AlertsEmbeddableState,
  SloItem,
} from '../../../../server/lib/embeddables/alerts_schema';

export interface LegacyAlertsSloItem {
  id: string;
  instanceId: string;
  groupBy: string[];
  name: string;
}

/** Maps legacy camelCase slo item to current schema (slo_id, slo_instance_id only). */
function mapLegacySloItem(slo: Record<string, unknown>): SloItem {
  return {
    slo_id: (slo.slo_id as string) ?? (slo.id as string) ?? '',
    slo_instance_id: (slo.slo_instance_id as string) ?? (slo.instanceId as string) ?? '',
  };
}

export interface LegacyAlertsState {
  showAllGroupByInstances: boolean;
  slos: LegacyAlertsSloItem[];
}

/**
 * Migration: When legacy show_all_group_by_instances was true and a slo had a specific instance,
 * the toggle overrode the selection — user intended "all instances". Set slo_instance_id to "*".
 */
function migrateSlos(slos: SloItem[], legacyShowAll: boolean): SloItem[] {
  const migrated = legacyShowAll
    ? slos.map((slo) =>
        slo.slo_instance_id !== ALL_VALUE ? { ...slo, slo_instance_id: ALL_VALUE } : slo
      )
    : slos;
  // Deduplicate by (slo_id, slo_instance_id) — migration can produce identical entries
  // e.g. 3 specific instances of the same SLO with toggle on all become { slo_id, slo_instance_id: '*' }
  const seen = new Set<string>();
  return migrated.filter((slo) => {
    const key = `${slo.slo_id}\x1F${slo.slo_instance_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Transforms SLO Alerts embeddable state for serialization. Migrates legacy camelCase to snake_case. */
export function transformAlertsOut(storedState: AlertsEmbeddableState): AlertsEmbeddableState {
  const state = storedState as AlertsEmbeddableState & {
    slos?: Array<Record<string, unknown>>;
    showAllGroupByInstances?: boolean;
    show_all_group_by_instances?: boolean;
  };
  const {
    show_all_group_by_instances: _dropped,
    showAllGroupByInstances: _legacy,
    ...rest
  } = state;
  const rawSlos =
    state.slos?.map((slo) => {
      const hasLegacy = 'id' in slo || 'instanceId' in slo || 'groupBy' in slo;
      const mapped = hasLegacy ? mapLegacySloItem(slo) : (slo as Partial<SloItem>);
      return {
        slo_id: mapped.slo_id ?? '',
        slo_instance_id: mapped.slo_instance_id ?? ALL_VALUE,
      };
    }) ?? [];
  const legacyShowAll = state.show_all_group_by_instances ?? state.showAllGroupByInstances ?? false;
  const slos = migrateSlos(rawSlos, legacyShowAll);
  return { ...rest, slos };
}
