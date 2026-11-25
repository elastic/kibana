/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityViewMode } from '../../../../common/entity_analytics/entity_store/resolution_group';
import { useAnomalyOverview } from './use_anomaly_overview';

interface UseHasAnomaliesParams {
  entityId: string;
  entityType: string;
  mode?: EntityViewMode;
  enabled?: boolean;
}

/**
 * Returns true when the entity has at least one anomaly, false when confirmed
 * zero, or undefined while the query is still loading.
 *
 * Intentionally calls useAnomalyOverview with no time-range filters — the same
 * call the right panel already makes — so React Query serves the answer from
 * cache when the left panel opens after the right panel has loaded.
 */
export const useHasAnomalies = ({
  entityId,
  entityType,
  mode,
  enabled = true,
}: UseHasAnomaliesParams) => {
  const { data } = useAnomalyOverview({ entityId, entityType, mode, enabled });
  if (data === undefined) return undefined;
  return data.totalAnomaliesCount > 0;
};
