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
  GetRuleSetsMembershipResponse,
  PreviewRuleSetRequestBody,
  PreviewRuleSetResponse,
  RuleSet,
  RuleSetDefinition,
} from '../../../common/api/detection_engine/rule_sets';
import {
  RULE_SETS_BULK_ASSIGN_URL,
  RULE_SETS_MEMBERSHIP_URL,
  RULE_SETS_PREVIEW_URL,
  RULE_SETS_URL,
  RULE_SET_RULE_IDS_URL,
} from '../../../common/api/detection_engine/rule_sets';
import type { GranularRulesFacetCategory } from '../../../common/api/detection_engine/rule_management';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../common/api/detection_engine/rule_management/urls';
import { KibanaServices } from '../../common/lib/kibana';
import { fetchSearchRules } from '../rule_management/api/api';

const VERSION = '1';
const groupUrl = (id: string) => `${RULE_SETS_URL}/${encodeURIComponent(id)}`;
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
    version: VERSION,
    query: { with_counts: withCounts },
    signal,
  });

export const createRuleSet = (definition: RuleSetDefinition) =>
  http().fetch<RuleSet>(RULE_SETS_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(definition),
  });

export const updateRuleSet = ({
  id,
  version,
  ...definition
}: RuleSetDefinition & { id: string; version?: string }) =>
  http().fetch<RuleSet>(groupUrl(id), {
    method: 'PUT',
    version: VERSION,
    body: JSON.stringify({ ...definition, version }),
  });

export const deleteRuleSet = (id: string) =>
  http().fetch(groupUrl(id), { method: 'DELETE', version: VERSION });

export const previewRuleSet = (body: PreviewRuleSetRequestBody, signal?: AbortSignal) =>
  http().fetch<PreviewRuleSetResponse>(RULE_SETS_PREVIEW_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(body),
    signal,
  });

export const fetchRuleSetsMembership = (ids: string[], signal?: AbortSignal) =>
  http().fetch<GetRuleSetsMembershipResponse>(RULE_SETS_MEMBERSHIP_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify({ ids }),
    signal,
  });

export const bulkAssignRuleSets = (body: BulkAssignRuleSetsRequestBody) =>
  http().fetch<BulkAssignRuleSetsResponse>(RULE_SETS_BULK_ASSIGN_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(body),
  });

const RULE_SETS_QUERY_KEY = ['GET', RULE_SETS_URL];

/** The groups the user can see, without rule counts: fast, for lists and menus. */
export const useRuleSetsQuery = () =>
  useQuery(RULE_SETS_QUERY_KEY, ({ signal }) => fetchRuleSets({ signal, withCounts: false }), {
    refetchOnWindowFocus: false,
  });

/**
 * The groups with rule counts. The server runs one small count per group, so this request is
 * slower; the sidebar shows the list first and the counts when they arrive.
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
    const byId = new Map((counts.data?.groups ?? []).map((group) => [group.id, group]));
    return {
      groups: list.data.groups.map((group) => ({
        ...group,
        rules_count: byId.get(group.id)?.rules_count,
        failed_count: byId.get(group.id)?.failed_count,
      })),
    };
  }, [list.data, counts.data]);
  return { ...list, data };
};

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
  ['ruleSetRuleIds'],
  ['ruleSetOutcomes'],
  ['ruleSetFilterCounts'],
];

/** Refreshes the per-group data of the monitoring panels (rule ids and last run outcomes). */
export const useInvalidateRuleSetStats = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    RULE_SET_STATS_QUERY_KEYS.forEach((key) =>
      queryClient.invalidateQueries(key, { refetchType: 'active' })
    );
  }, [queryClient]);
};

/** After rules change (for example a bulk action), the rule counts of the groups are stale. */
export const useInvalidateRuleSetCounts = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleSetStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries([...RULE_SETS_QUERY_KEY, 'counts'], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

/** After a group changes, the group list and the rules table (filtered by group) are stale. */
export const useInvalidateRuleSets = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleSetStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries(RULE_SETS_QUERY_KEY, { refetchType: 'active' });
    queryClient.invalidateQueries(['POST', RULE_MANAGEMENT_RULES_URL_SEARCH], {
      refetchType: 'active',
    });
    queryClient.invalidateQueries(['POST', RULE_SETS_MEMBERSHIP_URL], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

export const useSaveRuleSetMutation = () => {
  const invalidate = useInvalidateRuleSets();
  return useMutation(
    (group: RuleSetDefinition & { id?: string; version?: string }) =>
      group.id ? updateRuleSet({ ...group, id: group.id }) : createRuleSet(group),
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

/** Saved object ids of all rules in a group, for APIs that take a rule id list (rule gaps). */
export const useRuleSetRuleIdsQuery = (ruleSetId: string | undefined) =>
  useQuery(
    ['ruleSetRuleIds', ruleSetId],
    async ({ signal }) => {
      const response = await http().fetch<{ ids: string[] }>(
        RULE_SET_RULE_IDS_URL.replace('{id}', encodeURIComponent(ruleSetId ?? '')),
        { method: 'GET', version: VERSION, signal }
      );
      return response.ids;
    },
    { enabled: Boolean(ruleSetId), refetchOnWindowFocus: false }
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
