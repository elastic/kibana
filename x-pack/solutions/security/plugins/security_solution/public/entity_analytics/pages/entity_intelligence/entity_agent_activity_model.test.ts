/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFinding } from './security_findings/types';
import { buildEntityAgentStory, entityAgentSessionPath } from './entity_agent_activity_model';

const entity: IntelligenceEntity = {
  id: 'user:requester',
  name: 'Requester',
  type: EntityType.user,
  identifierValue: 'requester@example.com',
  riskScoreNorm: 76,
  riskLevel: 'High',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const finding: SecurityFinding = {
  id: 'alert-1',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Protected customer lookup',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  actor: { id: 'google-sub', name: entity.identifierValue, provenance: 'authenticated_user' },
  agent: { id: 'agent-1', provider: 'google_adk', sessionId: 'session-1' },
  rule: { id: 'rule-1', name: 'Customer access' },
  policy: {
    id: 'policy-1',
    name: 'Customer access',
    mode: 'monitor',
    decision: 'deny',
    engine: 'monitor',
  },
  source: { id: 'alert-1', index: '.alerts-1' },
  ancestors: [],
  entityIds: [entity.id],
  invocation: {
    toolCallId: 'call-1',
    toolName: 'read_customer_reference',
    source: { index: 'native-tools', id: 'tool-1' },
    inputRecordHash: 'sha-1',
    inputSource: 'native',
    correlation: 'exact_native_observation',
    input: '{}',
    inputRedacted: false,
    inputTruncated: false,
    actorSource: 'google_signed_id_token_verified_by_application',
    runtimePrincipal: 'runtime@example.com',
  },
};
const history: RiskScoreHistoryResponse = {
  entity_id: entity.id,
  entity_type: 'user',
  interval: '3h',
  entries: [
    {
      '@timestamp': '2026-10-14T13:00:00Z',
      calculated_score_norm: 76,
      calculated_level: 'High',
      inputs: [
        {
          id: finding.source.id,
          index: finding.source.index,
          category: 'category_1',
          description: finding.title,
          contribution_score: 12.7,
          risk_score: 73,
        },
      ],
    },
  ],
};

it('attributes verified Google requester activity and proves the exact native risk input', () => {
  const story = buildEntityAgentStory(entity, [finding], history);
  expect(story.actions[0].attribution).toBe('authenticated_requester');
  expect(story.actions[0].riskInputs).toEqual(history.entries[0].inputs);
  expect(story.matchedAlertCount).toBe(1);
  expect(story.latestScore?.calculated_score_norm).toBe(76);
});

it.each(['actor', 'entity', 'name'])(
  'rejects conflicting %s attribution rather than guessing the requester',
  (conflict) => {
    const changed =
      conflict === 'actor'
        ? { ...finding, actor: { name: 'other@example.com' } }
        : conflict === 'entity'
        ? { ...finding, entityIds: ['different-entity'] }
        : { ...finding, entityIds: [], actor: { name: entity.name } };
    const story = buildEntityAgentStory(entity, [changed], history);
    expect(story.actions.some((action) => action.attribution === 'authenticated_requester')).toBe(
      false
    );
    if (conflict !== 'actor') expect(story.actions).toHaveLength(0);
  }
);

it('distinguishes a local account and an unverified name from an authenticated requester', () => {
  const local = {
    ...finding,
    invocation: undefined,
    actor: { name: entity.identifierValue, provenance: 'local_os_account' },
  };
  expect(buildEntityAgentStory(entity, [local]).actions[0].attribution).toBe('local_account');
  expect(
    buildEntityAgentStory(entity, [{ ...local, actor: { name: entity.identifierValue } }])
      .actions[0].attribution
  ).toBe('unverified_account');
});

it('does not treat an authenticated-user label alone as verified Google request authentication', () => {
  expect(
    buildEntityAgentStory(entity, [{ ...finding, invocation: undefined }]).actions[0].attribution
  ).toBe('unverified_account');
});

it('requires the stored subject ID as well as email and token provenance when linking by account', () => {
  const subjectEntity = { ...entity, identityId: 'google-sub' };
  const scoped = { ...finding, entityIds: [] };
  expect(buildEntityAgentStory(subjectEntity, [scoped]).actions[0].attribution).toBe(
    'authenticated_requester'
  );
  expect(
    buildEntityAgentStory(subjectEntity, [
      { ...scoped, actor: { ...finding.actor, id: 'other-sub' } },
    ]).actions
  ).toHaveLength(0);
  expect(
    buildEntityAgentStory(subjectEntity, [{ ...scoped, actor: { name: entity.identifierValue } }])
      .actions
  ).toHaveLength(0);
  expect(buildEntityAgentStory(entity, [scoped]).actions[0].attribution).toBe('unverified_account');
});

it('recognizes an executing service principal without claiming human ownership', () => {
  const service = {
    ...entity,
    type: EntityType.service,
    id: 'service:runtime',
    identifierValue: 'runtime@example.com',
  };
  const story = buildEntityAgentStory(service, [{ ...finding, entityIds: [service.id] }]);
  expect(story.actions[0].attribution).toBe('runtime_principal');
});

it('groups two policy records for one exact tool invocation and keeps both native risk inputs', () => {
  const blocked: SecurityFinding = {
    ...finding,
    id: 'alert-2',
    source: { ...finding.source, id: 'alert-2' },
    outcome: 'blocked',
    kind: 'guardrail',
  };
  const story = buildEntityAgentStory(entity, [finding, blocked, finding], history);
  expect(story.actions).toHaveLength(1);
  expect(story.actions[0].finding).toBe(blocked);
  expect(story.actions[0].findings).toEqual([finding, blocked]);
  expect(story.matchedAlertCount).toBe(1);
});

it.each(['hash', 'session', 'index', 'actor', 'runtime'])(
  'does not merge a tool reference with a different %s',
  (difference) => {
    const other = { ...finding, id: 'alert-2', source: { ...finding.source, id: 'alert-2' } };
    if (!finding.invocation || !finding.agent) throw new Error('Missing test evidence');
    if (difference === 'hash')
      other.invocation = { ...finding.invocation, inputRecordHash: 'different' };
    if (difference === 'index')
      other.invocation = {
        ...finding.invocation,
        source: { ...finding.invocation.source, index: 'other' },
      };
    if (difference === 'session') other.agent = { ...finding.agent, sessionId: 'other' };
    if (difference === 'actor') other.actor = { ...finding.actor, id: 'other' };
    if (difference === 'runtime')
      other.invocation = { ...finding.invocation, runtimePrincipal: 'other@example.com' };
    expect(buildEntityAgentStory(entity, [finding, other]).actions).toHaveLength(2);
  }
);

it('does not merge findings with incomplete invocation references', () => {
  const first = { ...finding, invocation: undefined };
  const second = { ...first, source: { ...finding.source, id: 'alert-2' } };
  expect(buildEntityAgentStory(entity, [first, second]).actions).toHaveLength(2);
});

it.each(['index', 'id', 'entity'])(
  'requires exact risk input %s despite identical names and timing',
  (difference) => {
    const input = history.entries[0].inputs?.[0];
    if (!input) throw new Error('Missing risk input');
    const changed =
      difference === 'index'
        ? { ...input, index: '.alerts-other' }
        : difference === 'id'
        ? { ...input, id: 'other' }
        : { ...input, entity_id: 'other-entity' };
    const result = buildEntityAgentStory(entity, [finding], {
      ...history,
      entries: [{ ...history.entries[0], inputs: [changed] }],
    });
    expect(result.matchedAlertCount).toBe(0);
  }
);

it('never falls back to older inputs when the latest score omits or no longer includes this alert', () => {
  const latest = { ...history.entries[0], '@timestamp': '2026-10-14T14:00:00Z', inputs: undefined };
  const unavailable = buildEntityAgentStory(entity, [finding], {
    ...history,
    entries: [history.entries[0], latest],
  });
  expect(unavailable.matchedAlertCount).toBe(0);
  expect(unavailable.riskInputsAvailable).toBe(false);
  const removed = buildEntityAgentStory(entity, [finding], {
    ...history,
    entries: [history.entries[0], { ...latest, inputs: [] }],
  });
  expect(removed.matchedAlertCount).toBe(0);
  expect(removed.riskInputsAvailable).toBe(true);
});

it('discards risk history for a different canonical entity or entity type', () => {
  expect(
    buildEntityAgentStory(entity, [finding], { ...history, entity_id: 'other' }).latestScore
  ).toBeUndefined();
  expect(
    buildEntityAgentStory(entity, [finding], { ...history, entity_type: 'host' }).latestScore
  ).toBeUndefined();
});

it('joins alias-based native risk inputs only after resolving their exact concrete document', () => {
  const alias = '.alerts-security.alerts-default';
  const inputs = history.entries[0].inputs?.map((input) => ({ ...input, index: alias }));
  const aliased = { ...history, entries: [{ ...history.entries[0], inputs }] };
  expect(buildEntityAgentStory(entity, [finding], aliased).matchedAlertCount).toBe(0);
  const resolution = { alias, complete: true, references: [finding.source] };
  expect(buildEntityAgentStory(entity, [finding], aliased, resolution).matchedAlertCount).toBe(1);
  expect(
    buildEntityAgentStory(entity, [finding], aliased, {
      ...resolution,
      references: [{ ...finding.source, index: 'other-index' }],
    }).matchedAlertCount
  ).toBe(0);
  const partial = buildEntityAgentStory(entity, [finding], aliased, {
    ...resolution,
    complete: false,
  });
  expect(partial.matchedAlertCount).toBe(0);
  expect(partial.actions[0].riskInputsVerified).toBe(false);
});

it('links an exact external installation/session and an Agent Builder invocation', () => {
  const external = new URL(entityAgentSessionPath(finding) ?? '', 'http://kibana');
  expect(external.searchParams.get('sessionId')).toBe(JSON.stringify(['agent-1', 'session-1']));
  expect(external.searchParams.get('scope')).toBe('agents');
  const builder = new URL(
    entityAgentSessionPath({
      ...finding,
      agent: { id: 'builder', provider: 'agent_builder', sessionId: 'trace:span' },
    }) ?? '',
    'http://kibana'
  );
  expect(builder.searchParams.get('agentId')).toBe('builder');
  expect(builder.searchParams.get('sessionId')).toBe('trace:span');
  expect(entityAgentSessionPath({ ...finding, agent: undefined })).toBeUndefined();
});
