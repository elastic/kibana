/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import type { ExternalAgentProvider } from './external_agent_provider';
import type { AgentSearchRequest } from './queries';
import {
  buildCodexSessionsQuery,
  buildCodexToolsQuery,
  CODEX_CONTENT_FIELDS,
} from './codex_queries';
import {
  codexSearchIncomplete,
  codexTotal,
  parseCodexSessions,
  parseCodexTools,
} from './codex_model';
import type { CodexSearchResponse, CodexSession } from './codex_types';

export const useCodexSessions = (spaceId?: string, provider: ExternalAgentProvider = 'codex') => {
  const { data } = useKibana().services;
  const query = useQuery<CodexSearchResponse>(
    ['entityIntelligenceCodexSessions', spaceId, provider],
    async ({ signal }) => {
      if (!spaceId) throw new Error('A resolved space is required');
      const response = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<CodexSearchResponse>>(
          buildCodexSessionsQuery(spaceId, provider),
          { abortSignal: signal }
        )
      );
      if (response.rawResponse._shards?.total === 0)
        throw new Error('Session summaries are unavailable');
      return response.rawResponse;
    },
    { enabled: Boolean(spaceId), retry: false, refetchOnWindowFocus: false, refetchInterval: 30000 }
  );
  const sessions = useMemo(
    () =>
      spaceId && query.data && !query.isError
        ? parseCodexSessions(query.data, spaceId, provider)
        : [],
    [spaceId, provider, query.data, query.isError]
  );
  return {
    sessions,
    isLoading: Boolean(spaceId) && query.isLoading,
    isRefreshing: query.isFetching,
    unavailable: !spaceId || query.isError,
    partial: Boolean(
      query.data &&
        !query.isError &&
        (codexSearchIncomplete(query.data) || sessions.length < query.data.hits.hits.length)
    ),
    total: query.data && !query.isError ? codexTotal(query.data) : undefined,
    refetch: query.refetch,
  };
};

export const useCodexSessionTools = (
  spaceId?: string,
  session?: CodexSession,
  evidenceDocumentIds: string[] = []
) => {
  const { data } = useKibana().services;
  const provider = session?.provider ?? 'codex';
  const evidenceIds = [...new Set(evidenceDocumentIds)].sort().slice(0, 100);
  const query = useQuery<CodexSearchResponse>(
    [
      'entityIntelligenceCodexTools',
      provider,
      spaceId,
      session?.agentId,
      session?.id,
      session?.ingestedAt,
      evidenceIds,
    ],
    async ({ signal }) => {
      if (!spaceId || !session) throw new Error('A space and session are required');
      const response = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<CodexSearchResponse>>(
          buildCodexToolsQuery(spaceId, session.agentId, session.id, provider),
          { abortSignal: signal }
        )
      );
      if (response.rawResponse._shards?.total === 0)
        throw new Error('Session evidence is unavailable');
      const source = response.rawResponse;
      const ids = source.hits.hits.flatMap((hit) =>
        evidenceIds.includes(hit._id) ? [hit._id] : []
      );
      if (ids.length === 0) return source;
      const request = buildCodexToolsQuery(spaceId, session.agentId, session.id, provider);
      const evidenceResponse = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<CodexSearchResponse>>(
          {
            params: {
              ...request.params,
              size: ids.length,
              _source: CODEX_CONTENT_FIELDS,
              query: {
                bool: {
                  filter: [request.params.query ?? { match_none: {} }, { ids: { values: ids } }],
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );
      return {
        ...source,
        hits: {
          ...source.hits,
          hits: source.hits.hits.map(
            (hit) =>
              evidenceResponse.rawResponse.hits.hits.find(
                (evidence) =>
                  evidence._id === hit._id &&
                  evidence._index === hit._index &&
                  ids.includes(hit._id)
              ) ?? hit
          ),
        },
      };
    },
    { enabled: Boolean(spaceId && session), retry: false, refetchOnWindowFocus: false }
  );
  const events = useMemo(
    () =>
      spaceId && session && query.data && !query.isError
        ? parseCodexTools(query.data, spaceId, session.agentId, session.id, provider)
        : [],
    [spaceId, session, provider, query.data, query.isError]
  );
  return {
    events,
    isLoading: Boolean(spaceId && session) && query.isLoading,
    unavailable: query.isError,
    complete: Boolean(
      query.data &&
        !query.isError &&
        !codexSearchIncomplete(query.data) &&
        events.length === query.data.hits.hits.length &&
        new Set(events.map((event) => event.id)).size === events.length &&
        events.length === session?.toolCount
    ),
    refetch: query.refetch,
  };
};
