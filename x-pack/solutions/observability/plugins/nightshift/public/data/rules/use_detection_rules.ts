/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
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
      : engineState === 'paused'
      ? { state: 'inactive', reason: 'engine_paused' }
      : sourceEnabled === false
      ? { state: 'inactive', reason: 'source_disabled' }
      : enabled
      ? { state: 'active' }
      : {
          state: 'inactive',
          reason: 'rule_disabled',
        };
  return { query, sourceId, occurrences, matches, lastActivity, status };
};

const MAX_LOADED_RULES = 1000;

const useRulesQuery = ({
  timeRange,
  perPage,
  queryIds,
  entityIds,
  unassignedEntities,
  enabled,
}: {
  timeRange: TimeRange;
  perPage: number;
  queryIds?: string[];
  entityIds?: string[];
  unassignedEntities?: boolean;
  enabled?: boolean;
}) => {
  const query = useFetchDiscoveryQueries({
    page: 1,
    perPage,
    status: ['active'],
    queryIds,
    entityIds,
    unassignedEntities,
    timeRange,
    enabled,
  });
  const { sourcesById, getSourceTitle } = useSourcesById();
  const engineState = useMaintenanceStatus().data?.state;
  // Stable between fetches: EuiInMemoryTable resets to page 1 whenever `items` changes identity.
  const rules = useMemo(
    () =>
      (query.data?.queries ?? []).map((row) =>
        toDetectionRule(row, {
          engineState,
          sourceEnabled: sourcesById.get(row.source_id)?.enabled,
        })
      ),
    [query.data, engineState, sourcesById]
  );
  return { query, rules, getSourceTitle };
};

/**
 * Reads the complete first page of rules for the chart and in-memory table. The server applies the
 * entity selection before paging, so a selection never depends on which rules made the first page.
 */
export const useDetectionRules = (
  timeRange: TimeRange,
  { entities, unassigned }: { entities: string[]; unassigned: boolean }
) => {
  const { query, rules, getSourceTitle } = useRulesQuery({
    timeRange,
    perPage: MAX_LOADED_RULES,
    entityIds: entities,
    unassignedEntities: unassigned,
  });
  const total = query.data?.total ?? 0;
  return {
    rules,
    total,
    isTruncated: total > MAX_LOADED_RULES,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    hasData: Boolean(query.data),
    getSourceTitle,
    refetch: query.refetch,
  };
};

/** Reads one rule by id, for deep links to rules outside the loaded first page. */
export const useDetectionRuleById = (
  timeRange: TimeRange,
  ruleId: string | undefined,
  enabled: boolean
) => {
  const { query, rules } = useRulesQuery({
    timeRange,
    perPage: 1,
    queryIds: ruleId ? [ruleId] : undefined,
    enabled: enabled && Boolean(ruleId),
  });
  return {
    // keepPreviousData can still hold the previous id's result while the new one loads.
    rule: rules.find(({ query: { id } }) => id === ruleId),
    isResolved: Boolean(query.data) && !query.isFetching && !query.isError,
  };
};
