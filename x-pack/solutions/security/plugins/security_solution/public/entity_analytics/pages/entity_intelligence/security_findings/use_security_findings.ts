/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import { useKibana } from '../../../../common/lib/kibana';
import type { AgentSearchRequest } from '../ai_agents/queries';
import {
  hasSecurityAncestor,
  securitySearchPartial,
  securitySearchTotal,
  securityScalarString,
  securitySingletonString,
  toSecurityFinding,
} from './model';
import {
  buildSecurityFindingsQuery,
  buildSecuritySourceQuery,
  securityScopeKey,
  securitySourceIndex,
  validSecurityScope,
} from './queries';
import type {
  SecurityAlertHit,
  SecurityFinding,
  SecurityFindingsResult,
  SecurityFindingScope,
  SecuritySearchResponse,
} from './types';

interface FindingsSnapshot {
  findings: SecurityFinding[];
  partial: boolean;
  total?: number;
}

/** Loads detection alerts, resolving session attribution only through exact source-event ancestry. */
export const useSecurityFindings = (
  scope: SecurityFindingScope,
  spaceId?: string
): SecurityFindingsResult => {
  const { data } = useKibana().services;
  const validScope = validSecurityScope(scope, spaceId);
  const query = useQuery<FindingsSnapshot>(
    ['entityIntelligenceSecurityFindings', spaceId, securityScopeKey(scope)],
    async ({ signal }) => {
      if (!spaceId || !validScope) throw new Error('Security finding scope is unavailable.');
      let sourceIds: Set<string> | undefined;
      let sourcePartial = false;
      if (scope.type === 'policy' || (scope.type === 'agent' && scope.sessionId)) {
        const response = await lastValueFrom(
          data.search.search<AgentSearchRequest, IKibanaSearchResponse<SecuritySearchResponse>>(
            buildSecuritySourceQuery(spaceId, scope),
            { abortSignal: signal }
          )
        );
        const sources = response.rawResponse;
        sourceIds = new Set(
          sources.hits.hits.flatMap((hit) => {
            const source = hit._source;
            const agent = source?.entity_intelligence?.agent;
            return hit._index === securitySourceIndex(spaceId) &&
              hit._id &&
              source?.entity_intelligence?.schema_version === 1 &&
              securityScalarString(source.kibana?.space_id) === spaceId &&
              (scope.type === 'policy'
                ? securityScalarString(source.entity_intelligence.control?.id) === scope.policyId
                : securityScalarString(agent?.id) === scope.agentId &&
                  securityScalarString(agent?.provider) === scope.provider &&
                  securityScalarString(agent?.session_id) === scope.sessionId &&
                  (!scope.traceId ||
                    securitySingletonString(source['trace.id'] ?? source.trace?.id) ===
                      scope.traceId))
              ? [hit._id]
              : [];
          })
        );
        const sourceTotal = securitySearchTotal(sources);
        sourcePartial =
          securitySearchPartial(sources) ||
          sourceTotal === undefined ||
          sourceTotal > sources.hits.hits.length ||
          sourceIds.size !== sources.hits.hits.length;
        if (sourceIds.size === 0) {
          // No matching telemetry cannot establish whether this session was monitored.
          return {
            findings: [],
            partial: scope.type !== 'policy' || sourcePartial,
            total: scope.type === 'policy' && !sourcePartial ? 0 : undefined,
          };
        }
      }
      const response: SecuritySearchResponse = await fetchQueryAlerts<SecurityAlertHit, never>({
        query: buildSecurityFindingsQuery(spaceId, scope, sourceIds ? [...sourceIds] : undefined),
        signal: signal ?? new AbortController().signal,
      });
      const findings = response.hits.hits
        .flatMap((hit): SecurityFinding[] => {
          const finding = toSecurityFinding(hit, spaceId);
          if (!finding) return [];
          if (scope.type === 'entity') {
            if (finding.entityIds.length > 0 && !finding.entityIds.includes(scope.entity.id))
              return [];
            if (finding.entityIds.length === 0) {
              const source = hit._source;
              const explicitEntityId = source?.['entity.id'] ?? source?.entity?.id;
              if (
                explicitEntityId !== undefined &&
                explicitEntityId !== null &&
                (!Array.isArray(explicitEntityId) || explicitEntityId.length > 0)
              )
                return [];
              if (
                scope.entity.type === 'user' &&
                scope.entity.identityId &&
                securitySingletonString(source?.['user.id'] ?? source?.user?.id) !==
                  scope.entity.identityId
              )
                return [];
              const identifier =
                scope.entity.type === 'user'
                  ? source?.['user.name'] ?? source?.user?.name
                  : scope.entity.type === 'host'
                  ? source?.['host.name'] ?? source?.host?.name
                  : scope.entity.type === 'service'
                  ? source?.['service.name'] ?? source?.service?.name
                  : undefined;
              const identifiers = Array.isArray(identifier) ? identifier : [identifier];
              if (!identifiers.includes(scope.entity.identifierValue)) return [];
            }
          }
          if (
            scope.type === 'policy' &&
            (finding.policy?.id !== scope.policyId ||
              !sourceIds ||
              !hasSecurityAncestor(finding, securitySourceIndex(spaceId), sourceIds))
          )
            return [];
          if (scope.type === 'agent') {
            if (finding.agent?.id !== scope.agentId || finding.agent.provider !== scope.provider)
              return [];
            if (scope.traceId && finding.traceId !== scope.traceId) return [];
            if (sourceIds && !hasSecurityAncestor(finding, securitySourceIndex(spaceId), sourceIds))
              return [];
            if (
              scope.sessionId &&
              finding.agent.sessionId &&
              finding.agent.sessionId !== scope.sessionId
            )
              return [];
          }
          return [finding];
        })
        .sort(
          (left, right) =>
            Date.parse(right.timestamp) - Date.parse(left.timestamp) ||
            left.id.localeCompare(right.id)
        );
      const total = securitySearchTotal(response);
      const rejected = findings.length !== response.hits.hits.length;
      const legacyEntityMatch =
        scope.type === 'entity' && findings.some((finding) => finding.entityIds.length === 0);
      return {
        findings,
        total: rejected || sourcePartial || legacyEntityMatch ? undefined : total,
        partial:
          sourcePartial ||
          legacyEntityMatch ||
          securitySearchPartial(response) ||
          total === undefined ||
          total > response.hits.hits.length ||
          rejected ||
          (scope.type === 'agent' && findings.length === 0),
      };
    },
    {
      enabled: validScope,
      retry: false,
      keepPreviousData: false,
      cacheTime: 0,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );
  const readable = validScope && !query.isError && !query.isFetching;
  return {
    findings: readable ? query.data?.findings ?? [] : [],
    total: readable ? query.data?.total : undefined,
    partial: readable ? query.data?.partial ?? false : false,
    isLoading: validScope && query.isLoading,
    isRefreshing: validScope && !query.isLoading && query.isFetching,
    unavailable: !validScope || query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
};
