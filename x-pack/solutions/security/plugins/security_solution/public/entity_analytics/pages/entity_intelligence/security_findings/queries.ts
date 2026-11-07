/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import type { AgentSearchRequest } from '../ai_agents/queries';
import type { SecurityFindingScope } from './types';

export const SECURITY_FINDING_LIMIT = 100;
export const SECURITY_SOURCE_LIMIT = 1000;
export const SECURITY_LOOKBACK = 'now-30d';
const contextFields = [
  'entity_intelligence.schema_version',
  'entity_intelligence.control.id',
  'entity_intelligence.control.name',
  'entity_intelligence.control.version',
  'entity_intelligence.control.clause',
  'entity_intelligence.control.policy_sha256',
  'entity_intelligence.control.definition',
  'entity_intelligence.request_id',
  'entity_intelligence.invocation',
  'entity_intelligence.control.mode',
  'entity_intelligence.control.decision',
  'entity_intelligence.control.outcome',
  'entity_intelligence.control.engine',
  'entity_intelligence.control.reason',
  'entity_intelligence.activity.type',
  'entity_intelligence.activity.target',
  'entity_intelligence.agent.id',
  'entity_intelligence.agent.name',
  'entity_intelligence.agent.provider',
  'entity_intelligence.agent.session_id',
  'entity_intelligence.actor_provenance',
  'entity_intelligence.scenario.id',
  'entity_intelligence.scenario.step',
  'entity_intelligence.scenario.kind',
];
export const securitySourceIndex = (spaceId: string): string =>
  `logs-entity_intelligence.security-${spaceId}`;

export const validSecurityScope = (scope: SecurityFindingScope, spaceId?: string): boolean =>
  Boolean(
    spaceId &&
      /^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId) &&
      (scope.type === 'all' ||
        (scope.type === 'policy' && /^[a-zA-Z0-9_-]{1,128}$/.test(scope.policyId)) ||
        (scope.type === 'entity' &&
          scope.entity.id.trim() &&
          scope.entity.identifierValue.trim() &&
          EntityTypeToIdentifierField[scope.entity.type]) ||
        (scope.type === 'agent' &&
          scope.agentId.trim() &&
          (scope.sessionId === undefined || scope.sessionId.trim()) &&
          (scope.traceId === undefined || scope.traceId.trim())))
  );

export const securityScopeKey = (scope: SecurityFindingScope): string =>
  scope.type === 'all'
    ? 'all'
    : scope.type === 'policy'
    ? JSON.stringify(['policy', scope.policyId])
    : scope.type === 'entity'
    ? JSON.stringify([
        'entity',
        scope.entity.type,
        scope.entity.id,
        scope.entity.identifierValue,
        ...(scope.entity.type === 'user' && scope.entity.identityId
          ? [scope.entity.identityId]
          : []),
      ])
    : JSON.stringify(['agent', scope.provider, scope.agentId, scope.sessionId, scope.traceId]);

export const buildSecuritySourceQuery = (
  spaceId: string,
  scope: Extract<SecurityFindingScope, { type: 'agent' | 'policy' }>
): AgentSearchRequest => ({
  params: {
    index: securitySourceIndex(spaceId),
    size: SECURITY_SOURCE_LIMIT,
    track_total_hits: true,
    allow_no_indices: false,
    ignore_unavailable: false,
    _source: [
      'kibana.space_id',
      'entity_intelligence.schema_version',
      'entity_intelligence.control.id',
      'entity_intelligence.agent.id',
      'entity_intelligence.agent.provider',
      'entity_intelligence.agent.session_id',
      'trace.id',
    ],
    query: {
      bool: {
        filter: [
          { term: { 'kibana.space_id': spaceId } },
          { term: { 'entity_intelligence.schema_version': 1 } },
          ...(scope.type === 'policy'
            ? [{ term: { 'entity_intelligence.control.id': scope.policyId } }]
            : [
                { term: { 'entity_intelligence.agent.id': scope.agentId } },
                { term: { 'entity_intelligence.agent.provider': scope.provider } },
              ]),
          { range: { '@timestamp': { gte: SECURITY_LOOKBACK, lte: 'now' } } },
          ...(scope.type === 'agent' && scope.sessionId
            ? [{ term: { 'entity_intelligence.agent.session_id': scope.sessionId } }]
            : []),
          ...(scope.type === 'agent' && scope.traceId
            ? [{ term: { 'trace.id': scope.traceId } }]
            : []),
        ],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  },
});

export const buildSecurityFindingsQuery = (
  spaceId: string,
  scope: SecurityFindingScope,
  sourceIds?: readonly string[]
): estypes.SearchRequest => {
  const filter: estypes.QueryDslQueryContainer[] = [
    { term: { 'kibana.space_ids': spaceId } },
    { range: { '@timestamp': { gte: SECURITY_LOOKBACK, lte: 'now' } } },
  ];
  if (scope.type === 'entity') {
    filter.push({
      bool: {
        should: [
          { term: { 'entity.id': scope.entity.id } },
          {
            bool: {
              filter: [
                {
                  term: {
                    [EntityTypeToIdentifierField[scope.entity.type]]: scope.entity.identifierValue,
                  },
                },
                ...(scope.entity.type === 'user' && scope.entity.identityId
                  ? [{ term: { 'user.id': scope.entity.identityId } }]
                  : []),
              ],
              must_not: [{ exists: { field: 'entity.id' } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  }
  if (scope.type === 'agent') {
    filter.push(
      { term: { 'agent.id': scope.agentId } },
      { term: { 'agent.type': scope.provider } }
    );
    if (scope.traceId) filter.push({ term: { 'trace.id': scope.traceId } });
    if (scope.sessionId) {
      filter.push(
        { term: { 'kibana.alert.ancestors.index': securitySourceIndex(spaceId) } },
        sourceIds?.length
          ? {
              terms: {
                'kibana.alert.ancestors.id': [...sourceIds].slice(0, SECURITY_SOURCE_LIMIT),
              },
            }
          : { match_none: {} }
      );
    }
  }
  if (scope.type === 'policy') {
    filter.push(
      { term: { 'kibana.alert.ancestors.index': securitySourceIndex(spaceId) } },
      sourceIds?.length
        ? { terms: { 'kibana.alert.ancestors.id': [...sourceIds].slice(0, SECURITY_SOURCE_LIMIT) } }
        : { match_none: {} }
    );
  }
  return {
    size: SECURITY_FINDING_LIMIT,
    track_total_hits: true,
    _source: [
      '@timestamp',
      'kibana.alert.original_time',
      'kibana.alert.rule.uuid',
      'kibana.alert.rule.name',
      'kibana.alert.reason',
      'kibana.alert.severity',
      'kibana.alert.workflow_status',
      'kibana.alert.ancestors',
      'kibana.space_ids',
      'entity.id',
      'user.id',
      'user.name',
      'host.id',
      'host.name',
      'service.id',
      'service.name',
      'agent.id',
      'agent.type',
      'agent.name',
      'trace.id',
      'event.action',
      ...contextFields,
    ],
    query: { bool: { filter } },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };
};
