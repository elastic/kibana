/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';
import { buildCodexContentQuery, getCodexIndex } from './codex_queries';
import { codexSearchIncomplete, parseCodexSessions, parseCodexTools } from './codex_model';
import type { AgentSearchRequest } from './queries';
import type { CodexSearchResponse, CodexSession, CodexToolEvent } from './codex_types';

/** Fetches content only for the exact selected observation and discards it when the detail view closes. */
export const useCodexContent = (
  spaceId: string | undefined,
  session: CodexSession,
  event?: CodexToolEvent
) => {
  const { data } = useKibana().services;
  const provider = session.provider ?? 'codex';
  const source = event?.source ?? session.source;
  const validScope = Boolean(
    spaceId &&
      source.index === getCodexIndex(spaceId, provider) &&
      (!event ||
        (event.agentId === session.agentId &&
          event.sessionId === session.id &&
          (event.provider ?? 'codex') === provider))
  );
  const query = useQuery<CodexSearchResponse>(
    [
      'entityIntelligenceExternalContent',
      provider,
      spaceId,
      session.agentId,
      session.id,
      source.index,
      source.id,
      session.ingestedAt,
    ],
    async ({ signal }) => {
      if (!spaceId || !validScope) throw new Error('Content scope is unavailable');
      const response = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<CodexSearchResponse>>(
          buildCodexContentQuery(
            spaceId,
            session.agentId,
            session.id,
            source.id,
            event ? 'tool_call' : 'session',
            provider
          ),
          { abortSignal: signal }
        )
      );
      if (
        codexSearchIncomplete(response.rawResponse) ||
        response.rawResponse.hits.hits.length !== 1 ||
        response.rawResponse.hits.hits[0]._index !== source.index ||
        response.rawResponse.hits.hits[0]._id !== source.id
      )
        throw new Error('Exact content evidence is unavailable');
      return response.rawResponse;
    },
    { enabled: validScope, retry: false, refetchOnWindowFocus: false, cacheTime: 0 }
  );
  const readable = validScope && !query.isError && !query.isFetching;
  const parsedSession =
    spaceId && query.data && readable && !event
      ? parseCodexSessions(query.data, spaceId, provider).find(
          (item) => item.id === session.id && item.agentId === session.agentId
        )
      : undefined;
  const parsedEvent =
    spaceId && query.data && readable && event
      ? parseCodexTools(query.data, spaceId, session.agentId, session.id, provider).find(
          (item) => item.id === event.id
        )
      : undefined;
  return {
    session: parsedSession,
    event: parsedEvent,
    isLoading: validScope && (query.isLoading || query.isFetching),
    unavailable:
      !validScope ||
      query.isError ||
      (!query.isLoading && !query.isFetching && !(parsedSession || parsedEvent)),
    refetch: query.refetch,
  };
};
