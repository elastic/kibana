/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  BulkAssignRuleSetsRequestBody,
  BulkAssignRuleSetsResponse,
  FindRuleSetsResponse,
  GetRuleSetGapsSummaryRequestBody,
  GetRuleSetGapsSummaryResponse,
  GetRuleSetsMembershipResponse,
  PreviewRuleSetRequestBody,
  PreviewRuleSetResponse,
  RuleSet,
  RuleSetDefinition,
  RuleSetSummary,
} from '../../../common/api/detection_engine/rule_sets';
import {
  RULE_SETS_API_VERSION,
  RULE_SETS_BULK_ASSIGN_URL,
  RULE_SETS_GAPS_SUMMARY_URL,
  RULE_SETS_INTERNAL_API_VERSION,
  RULE_SETS_MEMBERSHIP_URL,
  RULE_SETS_PREVIEW_URL,
  RULE_SETS_URL,
  RULE_SET_URL,
} from '../../../common/api/detection_engine/rule_sets';
import type { GranularRulesFacetCategory } from '../../../common/api/detection_engine/rule_management';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../common/api/detection_engine/rule_management/urls';
import { KibanaServices } from '../../common/lib/kibana';
import { fetchSearchRules } from '../rule_management/api/api';
import type { GapRangeValue } from '../rule_gaps/constants';
import { getGapRange } from '../rule_gaps/api/hooks/utils';

const ruleSetUrl = (id: string) => RULE_SET_URL.replace('{id}', encodeURIComponent(id));
const http = () => KibanaServices.get().http;

export const fetchRuleSets = ({
  signal,
  withCounts,
}: {
  signal?: AbortSignal;
  withCounts: boolean;
}) =>
  http().fetch<FindRuleSetsResponse>(RULE_SETS_URL, {
    method: 'GET',
    version: RULE_SETS_API_VERSION,
    query: { with_counts: withCounts },
    signal,
  });

export const fetchRuleSet = (id: string, signal?: AbortSignal) =>
  http().fetch<RuleSet>(ruleSetUrl(id), {
    method: 'GET',
    version: RULE_SETS_API_VERSION,
    signal,
  });

export const createRuleSet = (definition: RuleSetDefinition) =>
  http().fetch<RuleSet>(RULE_SETS_URL, {
    method: 'POST',
    version: RULE_SETS_API_VERSION,
    body: JSON.stringify(definition),
  });

export const updateRuleSet = ({
  id,
  version,
  ...definition
}: RuleSetDefinition & { id: string; version?: string }) =>
  http().fetch<RuleSet>(ruleSetUrl(id), {
    method: 'PUT',
    version: RULE_SETS_API_VERSION,
    body: JSON.stringify({ ...definition, version }),
  });

export const deleteRuleSet = (id: string) =>
  http().fetch(ruleSetUrl(id), { method: 'DELETE', version: RULE_SETS_API_VERSION });

export const previewRuleSet = (body: PreviewRuleSetRequestBody, signal?: AbortSignal) =>
  http().fetch<PreviewRuleSetResponse>(RULE_SETS_PREVIEW_URL, {
    method: 'POST',
    version: RULE_SETS_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
    signal,
  });

export const fetchRuleSetsMembership = (ids: string[], signal?: AbortSignal) =>
  http().fetch<GetRuleSetsMembershipResponse>(RULE_SETS_MEMBERSHIP_URL, {
    method: 'POST',
    version: RULE_SETS_INTERNAL_API_VERSION,
    body: JSON.stringify({ ids }),
    signal,
  });

export const bulkAssignRuleSets = (body: BulkAssignRuleSetsRequestBody) =>
  http().fetch<BulkAssignRuleSetsResponse>(RULE_SETS_BULK_ASSIGN_URL, {
    method: 'POST',
    version: RULE_SETS_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
  });

export const fetchRuleSetGapsSummary = (
  body: GetRuleSetGapsSummaryRequestBody,
  signal?: AbortSignal
) =>
  http().fetch<GetRuleSetGapsSummaryResponse>(RULE_SETS_GAPS_SUMMARY_URL, {
    method: 'POST',
    version: RULE_SETS_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
    signal,
  });

const RULE_SETS_QUERY_KEY = ['GET', RULE_SETS_URL];
const RULE_SET_QUERY_KEY = ['GET', RULE_SET_URL];

/** The sets the user can see, without rule counts: fast, for lists and menus. */
export const useRuleSetsQuery = () =>
  useQuery(RULE_SETS_QUERY_KEY, ({ signal }) => fetchRuleSets({ signal, withCounts: false }), {
    refetchOnWindowFocus: false,
    select: (response): RuleSetSummary[] => response.data,
  });

/**
 * The sets with rule counts. The server runs one small count per set, so this request is
 * slower; the switcher shows the list first and the counts when they arrive.
 */
export const useRuleSetsWithCountsQuery = () => {
  const list = useRuleSetsQuery();
  const counts = useQuery(
    [...RULE_SETS_QUERY_KEY, 'counts'],
    ({ signal }) => fetchRuleSets({ signal, withCounts: true }),
    { refetchOnWindowFocus: false }
  );
  const data = useMemo(() => {
    if (!list.data) return undefined;
    const byId = new Map((counts.data?.data ?? []).map((set) => [set.id, set]));
    return list.data.map((set) => ({
      ...set,
      rules_count: byId.get(set.id)?.rules_count,
      failed_count: byId.get(set.id)?.failed_count,
    }));
  }, [list.data, counts.data]);
  return { ...list, data };
};

/** One set with its full definition (picked and left-out rules), for the editor. */
export const useRuleSetQuery = (id: string | undefined) =>
  useQuery([...RULE_SET_QUERY_KEY, id], ({ signal }) => fetchRuleSet(id ?? '', signal), {
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });

export const useRuleSetPreviewQuery = (body: PreviewRuleSetRequestBody, enabled = true) =>
  useQuery(['POST', RULE_SETS_PREVIEW_URL, body], ({ signal }) => previewRuleSet(body, signal), {
    enabled,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

export const useRuleSetsMembershipQuery = (ids: string[], enabled: boolean) =>
  useQuery(
    ['POST', RULE_SETS_MEMBERSHIP_URL, ids],
    ({ signal }) => fetchRuleSetsMembership(ids, signal),
    { enabled: enabled && ids.length > 0, refetchOnWindowFocus: false, staleTime: 0 }
  );

const RULE_SET_STATS_QUERY_KEYS = [
  ['POST', RULE_SETS_GAPS_SUMMARY_URL],
  ['ruleSetOutcomes'],
  ['ruleSetFilterCounts'],
];

/** Refreshes the per-set data of the monitoring panels (gaps and last run outcomes). */
export const useInvalidateRuleSetStats = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    RULE_SET_STATS_QUERY_KEYS.forEach((key) =>
      queryClient.invalidateQueries(key, { refetchType: 'active' })
    );
  }, [queryClient]);
};

/** After rules change (for example a bulk action), the rule counts of the sets are stale. */
export const useInvalidateRuleSetCounts = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleSetStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries([...RULE_SETS_QUERY_KEY, 'counts'], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

/** After a set changes, the set list and the rules table (filtered by set) are stale. */
export const useInvalidateRuleSets = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleSetStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries(RULE_SETS_QUERY_KEY, { refetchType: 'active' });
    queryClient.invalidateQueries(RULE_SET_QUERY_KEY, { refetchType: 'active' });
    queryClient.invalidateQueries(['POST', RULE_MANAGEMENT_RULES_URL_SEARCH], {
      refetchType: 'active',
    });
    queryClient.invalidateQueries(['POST', RULE_SETS_MEMBERSHIP_URL], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

export const useSaveRuleSetMutation = () => {
  const invalidate = useInvalidateRuleSets();
  return useMutation(
    (set: RuleSetDefinition & { id?: string; version?: string }) =>
      set.id ? updateRuleSet({ ...set, id: set.id }) : createRuleSet(set),
    { onSettled: invalidate }
  );
};

export const useDeleteRuleSetMutation = () => {
  const invalidate = useInvalidateRuleSets();
  return useMutation(deleteRuleSet, { onSettled: invalidate });
};

export const useBulkAssignRuleSetsMutation = () => {
  const invalidate = useInvalidateRuleSets();
  return useMutation(bulkAssignRuleSets, { onSettled: invalidate });
};

/** Gap summary of the rules of a set, computed on the server. */
export const useRuleSetGapsSummaryQuery = (
  {
    ruleSetId,
    gapRange,
    schedulerId,
  }: {
    ruleSetId: string | undefined;
    gapRange: GapRangeValue;
    schedulerId?: string;
  },
  enabled: boolean
) =>
  useQuery(
    // The relative range is the key: start and end move with the clock.
    ['POST', RULE_SETS_GAPS_SUMMARY_URL, ruleSetId, gapRange, schedulerId],
    ({ signal }) =>
      fetchRuleSetGapsSummary(
        {
          rule_set_id: ruleSetId ?? '',
          ...getGapRange(gapRange),
          scheduler_id: schedulerId,
        },
        signal
      ),
    {
      enabled: enabled && Boolean(ruleSetId),
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

/** Last run outcome counts of the rules in a group, in the shape of the space health API. */
export const useRuleSetOutcomesQuery = (ruleSetId: string | undefined) =>
  useQuery(
    ['ruleSetOutcomes', ruleSetId],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        rule_scope: { rule_set_id: ruleSetId },
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        aggregations: { counts: ['lastRunOutcome', 'enabled'] },
        signal,
      });
      const outcomes = response.counts?.lastRunOutcome ?? {};
      return {
        all: { total: response.total },
        // Elasticsearch returns boolean term keys as 1 and 0.
        enabled: { total: response.counts?.enabled?.['1'] ?? response.counts?.enabled?.true ?? 0 },
        by_outcome: {
          succeeded: { total: outcomes.succeeded ?? 0 },
          warning: { total: outcomes.warning ?? 0 },
          failed: { total: outcomes.failed ?? 0 },
        },
      };
    },
    { enabled: Boolean(ruleSetId), refetchOnWindowFocus: false }
  );

/** Rules per value of one facet in the whole space: the values that rules really use. */
export const useRuleFacetCountsQuery = (category: GranularRulesFacetCategory) =>
  useQuery(
    ['ruleFacetCounts', category],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        aggregations: { counts: [category] },
        signal,
      });
      return response.counts?.[category] ?? {};
    },
    { refetchOnWindowFocus: false, staleTime: 60_000 }
  );

/**
 * Counts for the table filters inside a set: its tags and its Elastic/custom rules. Without a
 * set the filters show space-wide counts from the rule management filters API.
 */
export const useRuleSetFilterCountsQuery = (ruleSetId: string | undefined) =>
  useQuery(
    ['ruleSetFilterCounts', ruleSetId],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        rule_scope: { rule_set_id: ruleSetId },
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        aggregations: { counts: ['tags', 'source'] },
        signal,
      });
      const source = response.counts?.source ?? {};
      return {
        tags: Object.keys(response.counts?.tags ?? {}).sort(),
        prebuilt: source.true ?? 0,
        custom: source.false ?? 0,
      };
    },
    { enabled: Boolean(ruleSetId), refetchOnWindowFocus: false }
  );
