/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import type { EntityAlertSignal } from '../entities/enrichment';
import { emptyAlertSignal } from '../entities/enrichment';
import { entityEvidenceKey } from '../entities/evidence';

const ALERTS_LOOKBACK = 'now-30d';
const ENTITY_BUCKET_SIZE = 2000;
const RULE_BUCKET_SIZE = 30;

interface RuleBucket {
  key: string;
  doc_count: number;
}

interface WindowCountAgg {
  doc_count: number;
}

interface EntityBucket {
  key: string;
  doc_count: number;
  rules?: { buckets: RuleBucket[] };
  last_alert?: { value: number | null; value_as_string?: string };
  w1?: WindowCountAgg;
  w7?: WindowCountAgg;
  w30?: WindowCountAgg;
}

interface EntityBuckets {
  buckets: EntityBucket[];
  sum_other_doc_count?: number;
  doc_count_error_upper_bound?: number;
}

interface AlertsByEntityAggregation {
  by_user?: EntityBuckets;
  by_host?: EntityBuckets;
  by_service?: EntityBuckets;
}

const windowFilters = {
  w1: { range: { '@timestamp': { gte: 'now-1d', lte: 'now' } } },
  w7: { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } },
  w30: { range: { '@timestamp': { gte: 'now-30d', lte: 'now' } } },
};

const entityAgg = (field: string) => ({
  terms: { field, size: ENTITY_BUCKET_SIZE },
  aggs: {
    rules: { terms: { field: 'kibana.alert.rule.name', size: RULE_BUCKET_SIZE } },
    last_alert: { max: { field: '@timestamp' } },
    w1: { filter: windowFilters.w1 },
    w7: { filter: windowFilters.w7 },
    w30: { filter: windowFilters.w30 },
  },
});

/** Aggregates alert counts without merging identifiers from different entity types. */
export const buildEntityAlertSignals = (
  aggregations: AlertsByEntityAggregation | undefined
): Map<string, EntityAlertSignal> => {
  const map = new Map<string, EntityAlertSignal>();
  const ingest = (type: string, buckets: EntityBucket[] | undefined) => {
    for (const bucket of buckets ?? []) {
      const key = entityEvidenceKey(type, bucket.key);
      if (bucket.key) {
        const existing = map.get(key) ?? emptyAlertSignal();
        const ruleNames = new Set(existing.ruleNames);
        for (const rule of bucket.rules?.buckets ?? []) {
          if (rule.key) ruleNames.add(rule.key);
        }
        const lastAlert = bucket.last_alert?.value ?? undefined;
        map.set(key, {
          total: existing.total + bucket.doc_count,
          ruleNames: [...ruleNames],
          lastAlert:
            lastAlert !== undefined
              ? Math.max(existing.lastAlert ?? 0, lastAlert)
              : existing.lastAlert,
          windowCounts: {
            w1: existing.windowCounts.w1 + (bucket.w1?.doc_count ?? 0),
            w7: existing.windowCounts.w7 + (bucket.w7?.doc_count ?? 0),
            w30: existing.windowCounts.w30 + (bucket.w30?.doc_count ?? 0),
          },
        });
      }
    }
  };
  ingest('user', aggregations?.by_user?.buckets);
  ingest('host', aggregations?.by_host?.buckets);
  ingest('service', aggregations?.by_service?.buckets);
  return map;
};

/**
 * Aggregates real detection alerts (`.alerts-security.alerts-*` via the
 * detection-engine signals search API) grouped by entity identifier
 * (`user.name`, `host.name`, `service.name`), pulling per-entity alert count,
 * distinct firing rules, last-alert time, and per-trend-window counts (for the
 * alert delta). Every value is a live alert count.
 */
export const useEntityAlertSignals = (enabled = true) => {
  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceEntitiesAlertSignals', ALERTS_LOOKBACK],
    ({ signal }) =>
      fetchQueryAlerts<never, AlertsByEntityAggregation>({
        query: {
          size: 0,
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: ALERTS_LOOKBACK, lte: 'now' } } }],
            },
          },
          aggs: {
            by_user: entityAgg('user.name'),
            by_host: entityAgg('host.name'),
            by_service: entityAgg('service.name'),
          },
        },
        signal: signal ?? new AbortController().signal,
      }),
    { enabled, retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const signalsByName = useMemo(
    () => buildEntityAlertSignals(data?.aggregations),
    [data?.aggregations]
  );

  /** Distinct firing rules across all entities, with the entity count per rule. */
  const rulesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const signal of signalsByName.values()) {
      for (const rule of signal.ruleNames) {
        counts.set(rule, (counts.get(rule) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([ruleName, entityCount]) => ({ ruleName, entityCount }))
      .sort((a, b) => b.entityCount - a.entityCount || a.ruleName.localeCompare(b.ruleName));
  }, [signalsByName]);

  const isPartial = Object.values(data?.aggregations ?? {}).some(
    (buckets: EntityBuckets) =>
      (buckets.sum_other_doc_count ?? 0) > 0 || (buckets.doc_count_error_upper_bound ?? 0) > 0
  );

  return { signalsByName, rulesWithCounts, isLoading, isError, isPartial };
};
