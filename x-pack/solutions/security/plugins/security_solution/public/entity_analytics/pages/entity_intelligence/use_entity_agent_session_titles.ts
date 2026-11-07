/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../common/lib/kibana';
import type { SecurityFinding } from './security_findings/types';
import type { AgentSearchRequest } from './ai_agents/queries';
import type { CodexSearchResponse, CodexSession } from './ai_agents/codex_types';
import type { ExternalAgentProvider } from './ai_agents/external_agent_provider';
import { buildCodexSessionsQuery } from './ai_agents/codex_queries';
import { codexSearchIncomplete, codexTotal, parseCodexSessions } from './ai_agents/codex_model';

interface SessionReference {
  provider: ExternalAgentProvider;
  agentId: string;
  sessionId: string;
}

/** Loads bounded, exact session titles for agent observations already linked to this entity. */
export const useEntityAgentSessionTitles = (
  spaceId: string | undefined,
  findings: readonly SecurityFinding[]
): readonly CodexSession[] => {
  const { data } = useKibana().services;
  const validSpace = Boolean(spaceId && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId));
  const references: SessionReference[] = [
    ...new Map(
      findings.flatMap(({ agent }) =>
        agent?.id &&
        agent.sessionId &&
        agent.id.length <= 512 &&
        agent.sessionId.length <= 512 &&
        agent.provider !== 'agent_builder'
          ? [
              [
                JSON.stringify([agent.provider, agent.id, agent.sessionId]),
                { provider: agent.provider, agentId: agent.id, sessionId: agent.sessionId },
              ] as const,
            ]
          : []
      )
    ).values(),
  ]
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    .slice(0, 24);
  const query = useQuery<CodexSession[]>(
    ['entityIntelligenceAgentGraphTitles', spaceId, references],
    async ({ signal }) => {
      if (!spaceId || !validSpace) throw new Error('A resolved space is required.');
      const providers = [...new Set(references.map(({ provider }) => provider))];
      const results = await Promise.all(
        providers.map(async (provider) => {
          const pairs = references.filter((reference) => reference.provider === provider);
          const request = buildCodexSessionsQuery(spaceId, provider);
          const response = await lastValueFrom(
            data.search.search<AgentSearchRequest, IKibanaSearchResponse<CodexSearchResponse>>(
              {
                params: {
                  ...request.params,
                  size: pairs.length * 2,
                  query: {
                    bool: {
                      filter: [
                        request.params.query ?? { match_none: {} },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: pairs.map(({ agentId, sessionId }) => ({
                              bool: {
                                filter: [
                                  { term: { 'agent.id': agentId } },
                                  { term: { 'session.id': sessionId } },
                                ],
                              },
                            })),
                          },
                        },
                      ],
                    },
                  },
                },
              },
              { abortSignal: signal }
            )
          );
          const total = codexTotal(response.rawResponse);
          if (
            response.rawResponse.hits.total === undefined ||
            !Number.isSafeInteger(total) ||
            total !== response.rawResponse.hits.hits.length ||
            codexSearchIncomplete(response.rawResponse)
          )
            return [];
          const sessions = parseCodexSessions(response.rawResponse, spaceId, provider);
          return sessions.filter(
            (session) =>
              session.source.index === request.params.index &&
              pairs.some(
                (pair) => pair.agentId === session.agentId && pair.sessionId === session.id
              ) &&
              sessions.filter(
                (candidate) => candidate.agentId === session.agentId && candidate.id === session.id
              ).length === 1
          );
        })
      );
      return results.flat();
    },
    {
      enabled: Boolean(validSpace && references.length),
      retry: false,
      refetchOnWindowFocus: false,
      keepPreviousData: false,
      staleTime: 30000,
    }
  );
  return !validSpace || query.isFetching || query.isError || !references.length
    ? []
    : query.data ?? [];
};
