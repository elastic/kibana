/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { useKibana } from '../../../common/lib/kibana';
import type { IntelligenceEntity } from './common';
import type { AgentSearchRequest } from './ai_agents/queries';
import type { SecurityFinding, SecuritySearchResponse } from './security_findings/types';
import { securitySearchPartial, securitySearchTotal } from './security_findings/model';
import {
  latestEntityRiskScore,
  type EntityRiskInputResolution,
} from './entity_agent_activity_model';

export const entityRiskAlertAlias = (spaceId?: string): string | undefined =>
  spaceId && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)
    ? `.alerts-security.alerts-${spaceId}`
    : undefined;

/** Resolves each native risk alias reference to exactly one returned backing document. */
export const resolveEntityRiskInputReferences = (
  alias: string,
  spaceId: string,
  ids: string[],
  response: SecuritySearchResponse
): EntityRiskInputResolution => {
  const total = securitySearchTotal(response);
  if (
    securitySearchPartial(response) ||
    total === undefined ||
    total !== response.hits.hits.length
  ) {
    return { alias, complete: false, references: [] };
  }
  const references = ids.flatMap((id) => {
    const hits = response.hits.hits.filter((hit) => hit._id === id);
    if (hits.length !== 1 || !hits[0]._index) return [];
    const spaces = hits[0]._source?.['kibana.space_ids'] ?? hits[0]._source?.kibana?.space_ids;
    if (!(Array.isArray(spaces) ? spaces : [spaces]).includes(spaceId)) return [];
    return [{ id, index: hits[0]._index }];
  });
  return { alias, complete: references.length === ids.length, references };
};

/** Reads only current-space alert IDs shared by loaded agent findings and the latest risk inputs. */
export const useEntityAgentRiskInputs = (
  entity: IntelligenceEntity,
  findings: SecurityFinding[],
  history: RiskScoreHistoryResponse | undefined,
  spaceId?: string
): EntityRiskInputResolution & { isLoading: boolean } => {
  const { data } = useKibana().services;
  const alias = entityRiskAlertAlias(spaceId);
  const latest = latestEntityRiskScore(entity, history);
  const findingIds = new Set(
    findings
      .filter((finding) => finding.agent && finding.policy)
      .map((finding) => finding.source.id)
  );
  const ids = [
    ...new Set(
      (latest?.inputs ?? [])
        .filter((input) => input.index === alias && findingIds.has(input.id))
        .map((input) => input.id)
    ),
  ]
    .sort()
    .slice(0, 100);
  const query = useQuery<EntityRiskInputResolution>(
    ['entityIntelligenceAgentRiskInputs', spaceId, entity.id, latest?.['@timestamp'], ids],
    async ({ signal }) => {
      if (!alias || !spaceId) throw new Error('Risk input resolution requires a current space.');
      const response = await lastValueFrom(
        data.search.search<AgentSearchRequest, IKibanaSearchResponse<SecuritySearchResponse>>(
          {
            params: {
              index: alias,
              size: 200,
              track_total_hits: true,
              allow_no_indices: false,
              ignore_unavailable: false,
              _source: ['kibana.space_ids'],
              query: {
                bool: {
                  filter: [{ ids: { values: ids } }, { term: { 'kibana.space_ids': spaceId } }],
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );
      return resolveEntityRiskInputReferences(alias, spaceId, ids, response.rawResponse);
    },
    {
      enabled: Boolean(alias && ids.length),
      retry: false,
      keepPreviousData: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
    }
  );
  return {
    alias,
    complete: !ids.length || (!query.isFetching && !query.isError && query.data?.complete === true),
    references: !query.isFetching && !query.isError ? query.data?.references ?? [] : [],
    isLoading: ids.length > 0 && query.isFetching,
  };
};
