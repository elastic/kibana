/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from '../common';
import {
  buildSecurityFindingsQuery,
  buildSecuritySourceQuery,
  securityScopeKey,
  validSecurityScope,
} from './queries';
import type { SecurityFindingScope } from './types';

const scope: Extract<SecurityFindingScope, { type: 'agent' }> = {
  type: 'agent',
  provider: 'codex',
  agentId: 'installation-1',
  sessionId: 'session-1',
};
const entity: IntelligenceEntity = {
  id: 'user:actual-id',
  name: 'Display name',
  identifierValue: 'actual-ecs-name',
  type: EntityType.user,
  riskScoreNorm: undefined,
  riskLevel: 'Unknown',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};

it('joins an exact session through source index and source event identifiers', () => {
  expect(buildSecurityFindingsQuery('default', scope, ['event-1']).query).toEqual({
    bool: {
      filter: [
        { term: { 'kibana.space_ids': 'default' } },
        { range: { '@timestamp': { gte: 'now-30d', lte: 'now' } } },
        { term: { 'agent.id': 'installation-1' } },
        { term: { 'agent.type': 'codex' } },
        { term: { 'kibana.alert.ancestors.index': 'logs-entity_intelligence.security-default' } },
        { terms: { 'kibana.alert.ancestors.id': ['event-1'] } },
      ],
    },
  });
  expect(JSON.stringify(buildSecurityFindingsQuery('default', scope).query)).toContain(
    'match_none'
  );
});

it('bounds and scopes the source lookup by space, installation, provider and session', () => {
  const request = buildSecuritySourceQuery('finance', scope).params;
  expect(request).toMatchObject({
    index: 'logs-entity_intelligence.security-finance',
    size: 1000,
    track_total_hits: true,
    ignore_unavailable: false,
  });
  expect(request.query?.bool?.filter).toEqual(
    expect.arrayContaining([
      { term: { 'kibana.space_id': 'finance' } },
      { term: { 'entity_intelligence.agent.id': 'installation-1' } },
      { term: { 'entity_intelligence.agent.provider': 'codex' } },
      { term: { 'entity_intelligence.agent.session_id': 'session-1' } },
    ])
  );
});

it('supports exact Agent Builder trace filters without guessing session ancestry', () => {
  const request = buildSecurityFindingsQuery('default', {
    type: 'agent',
    provider: 'agent_builder',
    agentId: 'agent',
    traceId: 'trace-1',
  });
  expect(request.query?.bool?.filter).toEqual(
    expect.arrayContaining([
      { term: { 'trace.id': 'trace-1' } },
      { term: { 'agent.type': 'agent_builder' } },
    ])
  );
});

it.each([EntityType.user, EntityType.host, EntityType.service, EntityType.generic])(
  'uses the raw identifier and correct field for %s',
  (type) => {
    const field = type === EntityType.generic ? 'entity.id' : `${type}.name`;
    expect(
      buildSecurityFindingsQuery('default', { type: 'entity', entity: { ...entity, type } }).query
        ?.bool?.filter
    ).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [
              { term: { 'entity.id': 'user:actual-id' } },
              {
                bool: {
                  filter: [{ term: { [field]: 'actual-ecs-name' } }],
                  must_not: [{ exists: { field: 'entity.id' } }],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ])
    );
  }
);

it('requests bounded explicit metadata rather than commands or prompt content', () => {
  const request = buildSecurityFindingsQuery('default', { type: 'all' });
  expect(request.size).toBe(100);
  expect(request._source).not.toEqual(true);
  expect(JSON.stringify(request._source)).not.toMatch(/content|command_line|prompts|input/);
  expect(request._source).toEqual(
    expect.arrayContaining(['kibana.alert.ancestors', 'entity_intelligence.control.outcome'])
  );
});

it('requires the stored account subject for user-name fallback without changing explicit EUID matching', () => {
  const identified = { ...entity, identityId: 'google-subject' };
  expect(
    buildSecurityFindingsQuery('default', { type: 'entity', entity: identified }).query?.bool
      ?.filter
  ).toEqual(
    expect.arrayContaining([
      {
        bool: {
          should: [
            { term: { 'entity.id': entity.id } },
            {
              bool: {
                filter: [
                  { term: { 'user.name': entity.identifierValue } },
                  { term: { 'user.id': identified.identityId } },
                ],
                must_not: [{ exists: { field: 'entity.id' } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ])
  );
  expect(securityScopeKey({ type: 'entity', entity: identified })).not.toBe(
    securityScopeKey({ type: 'entity', entity: { ...identified, identityId: 'other-subject' } })
  );
  expect(
    JSON.stringify(
      buildSecurityFindingsQuery('default', {
        type: 'entity',
        entity: { ...identified, type: EntityType.host },
      }).query
    )
  ).not.toContain('user.id');
});

it('keys scope changes independently and rejects incomplete scopes', () => {
  expect(securityScopeKey(scope)).not.toBe(securityScopeKey({ ...scope, sessionId: 'session-2' }));
  expect(securityScopeKey(scope)).not.toBe(securityScopeKey({ ...scope, provider: 'cursor' }));
  expect(validSecurityScope(scope, undefined)).toBe(false);
  expect(validSecurityScope(scope, 'default*')).toBe(false);
  expect(validSecurityScope({ ...scope, agentId: '' }, 'default')).toBe(false);
  expect(validSecurityScope({ ...scope, sessionId: '' }, 'default')).toBe(false);
  expect(validSecurityScope({ type: 'all' }, 'default')).toBe(true);
});

it('loads the explicit call binding and complete recorded policy snapshot with findings', () => {
  expect(buildSecurityFindingsQuery('default', scope, ['event-1'])._source).toEqual(
    expect.arrayContaining([
      'entity_intelligence.request_id',
      'entity_intelligence.invocation',
      'entity_intelligence.control.version',
      'entity_intelligence.control.clause',
      'entity_intelligence.control.policy_sha256',
      'entity_intelligence.control.definition',
    ])
  );
});

it('scopes policy findings through explicit source ancestry rather than unindexed alert metadata', () => {
  const policyScope: SecurityFindingScope = { type: 'policy', policyId: 'policy-1' };
  expect(validSecurityScope(policyScope, 'default')).toBe(true);
  expect(JSON.stringify(buildSecuritySourceQuery('default', policyScope))).toContain(
    'entity_intelligence.control.id'
  );
  expect(JSON.stringify(buildSecurityFindingsQuery('default', policyScope, ['event-1']))).toContain(
    'event-1'
  );
  expect(JSON.stringify(buildSecurityFindingsQuery('default', policyScope))).toContain(
    'match_none'
  );
});
