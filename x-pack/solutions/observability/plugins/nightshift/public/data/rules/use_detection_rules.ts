/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { StreamQuery } from '@kbn/significant-events-schema';
import type { SignificantEventQueryRow } from './use_fetch_discovery_queries';
import { useFetchDiscoveryQueries } from './use_fetch_discovery_queries';
import { useSourcesById } from '../sources/use_sources_by_id';
import { useMaintenanceStatus } from '../maintenance/use_significant_events_maintenance';

export type RuleStatus =
  | { state: 'active' }
  | { state: 'inactive'; reason: 'engine_paused' | 'source_disabled' | 'rule_disabled' };

export interface DetectionRule {
  query: StreamQuery;
  sourceId: string;
  occurrences: Array<{ x: number; y: number }>;
  matches: number;
  lastActivity?: number;
  status?: RuleStatus;
}

export const toDetectionRule = (
  row: SignificantEventQueryRow,
  { engineState, sourceEnabled }: { engineState?: string; sourceEnabled?: boolean }
): DetectionRule => {
  const { query, source_id: sourceId, occurrences, rule_enabled: enabled } = row;
  const matches = occurrences.reduce((sum, { y }) => sum + y, 0);
  const lastActivity = [...occurrences].reverse().find(({ y }) => y > 0)?.x;
  const status: RuleStatus | undefined =
    enabled === undefined
      ? undefined
      : enabled
      ? { state: 'active' }
      : {
          state: 'inactive',
          reason:
            engineState === 'paused'
              ? 'engine_paused'
              : sourceEnabled === false
              ? 'source_disabled'
              : 'rule_disabled',
        };
  return { query, sourceId, occurrences, matches, lastActivity, status };
};

/** Reads the complete first page of rules for the chart and in-memory table. */
export const useDetectionRules = (timeRange: TimeRange) => {
  const query = useFetchDiscoveryQueries({
    page: 1,
    perPage: 1000,
    status: ['active'],
    timeRange,
  });
  const { sourcesById, getSourceTitle } = useSourcesById();
  const maintenance = useMaintenanceStatus();
  const rules = (query.data?.queries ?? []).map((row) =>
    toDetectionRule(row, {
      engineState: maintenance.data?.state,
      sourceEnabled: sourcesById.get(row.source_id)?.enabled,
    })
  );
  const total = query.data?.total ?? 0;
  return {
    rules,
    total,
    isTruncated: total > 1000,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    hasData: Boolean(query.data),
    getSourceTitle,
    refetch: query.refetch,
  };
};
