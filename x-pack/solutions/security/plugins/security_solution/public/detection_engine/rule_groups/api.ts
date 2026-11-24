/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  BulkAssignRuleGroupsRequestBody,
  BulkAssignRuleGroupsResponse,
  FindRuleGroupsResponse,
  GetRuleGroupsMembershipResponse,
  PreviewRuleGroupRequestBody,
  PreviewRuleGroupResponse,
  RuleGroup,
  RuleGroupDefinition,
} from '../../../common/api/detection_engine/rule_groups';
import {
  RULE_GROUPS_BULK_ASSIGN_URL,
  RULE_GROUPS_MEMBERSHIP_URL,
  RULE_GROUPS_PREVIEW_URL,
  RULE_GROUPS_URL,
  RULE_GROUP_RULE_IDS_URL,
} from '../../../common/api/detection_engine/rule_groups';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../common/api/detection_engine/rule_management/urls';
import { KibanaServices } from '../../common/lib/kibana';
import { fetchSearchRules } from '../rule_management/api/api';

const VERSION = '1';
const groupUrl = (id: string) => `${RULE_GROUPS_URL}/${encodeURIComponent(id)}`;
const http = () => KibanaServices.get().http;

export const fetchRuleGroups = ({
  signal,
  withCounts,
}: {
  signal?: AbortSignal;
  withCounts: boolean;
}) =>
  http().fetch<FindRuleGroupsResponse>(RULE_GROUPS_URL, {
    method: 'GET',
    version: VERSION,
    query: { with_counts: withCounts },
    signal,
  });

export const createRuleGroup = (definition: RuleGroupDefinition) =>
  http().fetch<RuleGroup>(RULE_GROUPS_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(definition),
  });

export const updateRuleGroup = ({
  id,
  version,
  ...definition
}: RuleGroupDefinition & { id: string; version?: string }) =>
  http().fetch<RuleGroup>(groupUrl(id), {
    method: 'PUT',
    version: VERSION,
    body: JSON.stringify({ ...definition, version }),
  });

export const deleteRuleGroup = (id: string) =>
  http().fetch(groupUrl(id), { method: 'DELETE', version: VERSION });

export const previewRuleGroup = (body: PreviewRuleGroupRequestBody, signal?: AbortSignal) =>
  http().fetch<PreviewRuleGroupResponse>(RULE_GROUPS_PREVIEW_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(body),
    signal,
  });

export const fetchRuleGroupsMembership = (ids: string[], signal?: AbortSignal) =>
  http().fetch<GetRuleGroupsMembershipResponse>(RULE_GROUPS_MEMBERSHIP_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify({ ids }),
    signal,
  });

export const bulkAssignRuleGroups = (body: BulkAssignRuleGroupsRequestBody) =>
  http().fetch<BulkAssignRuleGroupsResponse>(RULE_GROUPS_BULK_ASSIGN_URL, {
    method: 'POST',
    version: VERSION,
    body: JSON.stringify(body),
  });

const RULE_GROUPS_QUERY_KEY = ['GET', RULE_GROUPS_URL];

/** The groups the user can see, without rule counts: fast, for lists and menus. */
export const useRuleGroupsQuery = () =>
  useQuery(RULE_GROUPS_QUERY_KEY, ({ signal }) => fetchRuleGroups({ signal, withCounts: false }), {
    refetchOnWindowFocus: false,
  });

/**
 * The groups with rule counts. The server runs one small count per group, so this request is
 * slower; the sidebar shows the list first and the counts when they arrive.
 */
export const useRuleGroupsWithCountsQuery = () => {
  const list = useRuleGroupsQuery();
  const counts = useQuery(
    [...RULE_GROUPS_QUERY_KEY, 'counts'],
    ({ signal }) => fetchRuleGroups({ signal, withCounts: true }),
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

export const useRuleGroupPreviewQuery = (body: PreviewRuleGroupRequestBody, enabled = true) =>
  useQuery(
    ['POST', RULE_GROUPS_PREVIEW_URL, body],
    ({ signal }) => previewRuleGroup(body, signal),
    {
      enabled,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

export const useRuleGroupsMembershipQuery = (ids: string[], enabled: boolean) =>
  useQuery(
    ['POST', RULE_GROUPS_MEMBERSHIP_URL, ids],
    ({ signal }) => fetchRuleGroupsMembership(ids, signal),
    { enabled: enabled && ids.length > 0, refetchOnWindowFocus: false, staleTime: 0 }
  );

const RULE_GROUP_STATS_QUERY_KEYS = [
  ['ruleGroupRuleIds'],
  ['ruleGroupOutcomes'],
  ['ruleGroupFilterCounts'],
];

/** Refreshes the per-group data of the monitoring panels (rule ids and last run outcomes). */
export const useInvalidateRuleGroupStats = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    RULE_GROUP_STATS_QUERY_KEYS.forEach((key) =>
      queryClient.invalidateQueries(key, { refetchType: 'active' })
    );
  }, [queryClient]);
};

/** After rules change (for example a bulk action), the rule counts of the groups are stale. */
export const useInvalidateRuleGroupCounts = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleGroupStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries([...RULE_GROUPS_QUERY_KEY, 'counts'], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

/** After a group changes, the group list and the rules table (filtered by group) are stale. */
export const useInvalidateRuleGroups = () => {
  const queryClient = useQueryClient();
  const invalidateStats = useInvalidateRuleGroupStats();
  return useCallback(() => {
    invalidateStats();
    queryClient.invalidateQueries(RULE_GROUPS_QUERY_KEY, { refetchType: 'active' });
    queryClient.invalidateQueries(['POST', RULE_MANAGEMENT_RULES_URL_SEARCH], {
      refetchType: 'active',
    });
    queryClient.invalidateQueries(['POST', RULE_GROUPS_MEMBERSHIP_URL], { refetchType: 'active' });
  }, [queryClient, invalidateStats]);
};

export const useSaveRuleGroupMutation = () => {
  const invalidate = useInvalidateRuleGroups();
  return useMutation(
    (group: RuleGroupDefinition & { id?: string; version?: string }) =>
      group.id ? updateRuleGroup({ ...group, id: group.id }) : createRuleGroup(group),
    { onSettled: invalidate }
  );
};

export const useDeleteRuleGroupMutation = () => {
  const invalidate = useInvalidateRuleGroups();
  return useMutation(deleteRuleGroup, { onSettled: invalidate });
};

export const useBulkAssignRuleGroupsMutation = () => {
  const invalidate = useInvalidateRuleGroups();
  return useMutation(bulkAssignRuleGroups, { onSettled: invalidate });
};

/** Saved object ids of all rules in a group, for APIs that take a rule id list (rule gaps). */
export const useRuleGroupRuleIdsQuery = (ruleGroupId: string | undefined) =>
  useQuery(
    ['ruleGroupRuleIds', ruleGroupId],
    async ({ signal }) => {
      const response = await http().fetch<{ ids: string[] }>(
        RULE_GROUP_RULE_IDS_URL.replace('{id}', encodeURIComponent(ruleGroupId ?? '')),
        { method: 'GET', version: VERSION, signal }
      );
      return response.ids;
    },
    { enabled: Boolean(ruleGroupId), refetchOnWindowFocus: false }
  );

/** Last run outcome counts of the rules in a group, in the shape of the space health API. */
export const useRuleGroupOutcomesQuery = (ruleGroupId: string | undefined) =>
  useQuery(
    ['ruleGroupOutcomes', ruleGroupId],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        rule_group_id: ruleGroupId,
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
    { enabled: Boolean(ruleGroupId), refetchOnWindowFocus: false }
  );

/**
 * Counts for the table filters inside a group: its tags and its Elastic/custom rules. Without a
 * group the filters show space-wide counts from the rule management filters API.
 */
export const useRuleGroupFilterCountsQuery = (ruleGroupId: string | undefined) =>
  useQuery(
    ['ruleGroupFilterCounts', ruleGroupId],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        rule_group_id: ruleGroupId,
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
    { enabled: Boolean(ruleGroupId), refetchOnWindowFocus: false }
  );
