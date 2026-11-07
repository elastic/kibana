/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAnomalyBands } from '../../../components/recent_anomalies/anomaly_bands';
import { useRecentAnomaliesQuery } from '../../../components/recent_anomalies/hooks/recent_anomalies_query_hooks';

const ANOMALIES_TIME_RANGE = { from: 'now-30d', to: 'now' } as const;

export interface CompactAnomaly {
  entityId: string;
  entityName: string;
  entityType: string;
  maxScore: number;
}

/**
 * Reuses the Recent Anomalies ES|QL pipeline (ML records joined to the entity
 * store) but reduces the heatmap-shaped result to a compact "top anomalous
 * entities" list for the intelligence side panel.
 */
export const useCompactAnomalies = (spaceId: string | undefined) => {
  const { bands } = useAnomalyBands();

  const { data, entityMetadata, isLoading, isError, isTopRowsLimited } = useRecentAnomaliesQuery({
    anomalyBands: bands,
    viewBy: 'entity',
    spaceId,
    timeRange: ANOMALIES_TIME_RANGE,
  });

  const anomalies = useMemo<CompactAnomaly[]>(() => {
    if (!entityMetadata) return [];
    const maxScoreByEntity = new Map<string, number>();
    for (const record of data?.anomalyRecords ?? []) {
      const entityId = record.entity_id;
      const score = record.record_score;
      if (typeof entityId === 'string' && typeof score === 'number') {
        const current = maxScoreByEntity.get(entityId) ?? 0;
        if (score > current) maxScoreByEntity.set(entityId, score);
      }
    }
    return entityMetadata.map((entity) => ({
      entityId: entity.entityId,
      entityName: entity.entityName,
      entityType: entity.entityType,
      maxScore: Math.round(maxScoreByEntity.get(entity.entityId) ?? 0),
    }));
  }, [entityMetadata, data?.anomalyRecords]);

  return { anomalies, isLoading, isError, isPartial: isTopRowsLimited };
};
