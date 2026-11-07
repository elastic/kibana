/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import { buildAgentActivity, selectAgentTraceIds } from './model';
import { buildAgentInvocationsQuery, buildAgentTraceQuery } from './queries';
import type { AgentSearchRequest } from './queries';
import type {
  AgentActivity,
  AgentActivityResult,
  AgentInventoryItem,
  AgentSearchResponse,
} from './types';

/** Reads a bounded sample and follows parent span links before attributing a tool call. */
export const useAgentActivity = (
  spaceId: string | undefined,
  agent?: AgentInventoryItem,
  refreshKey = 0
): AgentActivityResult => {
  const { data } = useKibana().services;
  const enabled = Boolean(spaceId && agent);
  const query = useQuery<AgentActivity | undefined>(
    ['entityIntelligenceAgentActivity', spaceId, agent?.id, refreshKey],
    async ({ signal }) => {
      if (!spaceId || !agent) return undefined;
      const invocations = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<AgentSearchResponse>>(
          buildAgentInvocationsQuery(spaceId, agent),
          { abortSignal: signal }
        )
      );
      if (invocations.rawResponse._shards?.total === 0) {
        throw new Error('The agent trace data stream is unavailable');
      }
      const traceIds = selectAgentTraceIds(invocations.rawResponse);
      if (traceIds.length === 0) {
        return buildAgentActivity(
          agent,
          invocations.rawResponse,
          { hits: { hits: [], total: 0 } },
          []
        );
      }
      const traces = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<AgentSearchResponse>>(
          buildAgentTraceQuery(spaceId, traceIds),
          { abortSignal: signal }
        )
      );
      return buildAgentActivity(agent, invocations.rawResponse, traces.rawResponse, traceIds);
    },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );
  const { refetch: refetchActivity } = query;
  const refetch = useCallback(() => {
    if (enabled) void refetchActivity();
  }, [enabled, refetchActivity]);
  return {
    activity: query.isError ? undefined : query.data,
    status:
      query.isError || !query.data
        ? 'unavailable'
        : query.data.truncated || query.data.unattributedToolCalls > 0
        ? 'partial'
        : query.data.totalInvocations === 0
        ? 'empty'
        : 'available',
    isLoading: enabled && query.isLoading,
    isRefreshing: query.isFetching,
    refetch,
    error: query.isError
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiAgents.activityError',
          {
            defaultMessage:
              'Agent activity could not be read. Check trace collection and index read access for this space.',
          }
        )
      : undefined,
  };
};
