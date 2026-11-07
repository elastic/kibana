/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasSecurityAncestor,
  securitySearchPartial,
  securitySearchTotal,
  toSecurityFinding,
} from './model';
import type { SecurityAlertHit, SecurityControlFields } from './types';

const control: SecurityControlFields = {
  id: 'restricted-file',
  name: 'Restricted file access',
  engine: 'local_policy_gateway',
  mode: 'enforce',
  decision: 'deny',
  outcome: 'blocked',
};
const alert = (changes: Partial<SecurityControlFields> = {}): SecurityAlertHit => ({
  _index: '.internal.alerts-security.alerts-default-000001',
  _id: 'alert-1',
  _source: {
    '@timestamp': '2026-10-13T12:00:00Z',
    'kibana.alert.rule.name': 'Protected file access denied',
    'kibana.alert.rule.uuid': 'rule-1',
    'kibana.alert.severity': 'high',
    'kibana.alert.workflow_status': 'open',
    'kibana.space_ids': ['default'],
    'kibana.alert.ancestors': [
      { index: 'logs-entity_intelligence.security-default', id: 'event-1' },
    ],
    user: { id: 'user-1', name: 'James' },
    host: { id: 'host-1', name: 'workstation' },
    agent: { id: 'agent-1', name: 'Codex', type: 'codex' },
    entity: { id: ['user:user-1', 'host:host-1'] },
    event: { outcome: 'failure' },
    entity_intelligence: {
      schema_version: 1,
      actor_provenance: 'local_os_account',
      agent: { id: 'agent-1', provider: 'codex', session_id: 'session-1' },
      control: { ...control, ...changes },
      activity: { type: 'file_read', target: 'canary.txt' },
    },
  },
});

it('uses explicit enforcement evidence and keeps alert and event references separate', () => {
  expect(toSecurityFinding(alert(), 'default')).toMatchObject({
    kind: 'guardrail',
    outcome: 'blocked',
    severity: 'high',
    status: 'open',
    actor: { id: 'user-1', name: 'James', provenance: 'local_os_account' },
    host: { id: 'host-1', name: 'workstation' },
    agent: { id: 'agent-1', provider: 'codex', sessionId: 'session-1' },
    action: 'file_read',
    target: 'canary.txt',
    source: { index: '.internal.alerts-security.alerts-default-000001', id: 'alert-1' },
    ancestors: [{ index: 'logs-entity_intelligence.security-default', id: 'event-1' }],
    entityIds: ['user:user-1', 'host:host-1'],
  });
});

it.each(['enforce', 'monitor'])(
  'identifies a denied action that was allowed in %s mode',
  (mode) => {
    expect(toSecurityFinding(alert({ mode, outcome: 'allowed' }), 'default')).toMatchObject({
      kind: 'policy_violation',
      outcome: 'allowed',
    });
  }
);

it.each([
  { mode: ['enforce', 'monitor'] },
  { decision: ['deny', 'allow'] },
  { outcome: ['blocked', 'allowed'] },
  { mode: 'monitor' },
  { mode: undefined },
  { decision: 'allow' },
  { outcome: 'failure' },
  { outcome: undefined },
  { id: undefined },
  { name: undefined },
  { engine: undefined },
])('does not claim a guardrail blocked activity without complete evidence: %p', (changes) => {
  expect(toSecurityFinding(alert(changes), 'default')).toMatchObject({
    kind: 'detection',
    outcome: 'unknown',
  });
});

it('keeps policy-permitted execution distinct from a policy violation', () => {
  expect(
    toSecurityFinding(alert({ decision: 'allow', outcome: 'allowed' }), 'default')
  ).toMatchObject({
    kind: 'detection',
    outcome: 'allowed',
  });
});

it.each(['success', 'failure', 'unknown'])(
  'does not treat event.outcome=%s as a security outcome',
  (outcome) => {
    const hit = alert();
    if (hit._source) {
      delete hit._source.entity_intelligence;
      hit._source.event = { outcome, action: 'operation-blocked' };
      hit._source['kibana.alert.reason'] = 'Guardrail blocked, compromised, policy violated';
    }
    expect(toSecurityFinding(hit, 'default')).toMatchObject({
      kind: 'detection',
      outcome: 'unknown',
    });
  }
);

it('does not interpret unrecognized control schema versions', () => {
  const hit = alert();
  if (hit._source?.entity_intelligence) hit._source.entity_intelligence.schema_version = 2;
  expect(toSecurityFinding(hit, 'default')).toMatchObject({
    kind: 'detection',
    outcome: 'unknown',
  });
  expect(toSecurityFinding(hit, 'default')?.policy).toBeUndefined();
});

it('keeps workflow closed separate from enforcement blocked', () => {
  const hit = alert();
  if (hit._source) hit._source['kibana.alert.workflow_status'] = 'closed';
  expect(toSecurityFinding(hit, 'default')).toMatchObject({ status: 'closed', outcome: 'blocked' });
});

it('rejects other-space evidence and malformed essential alert metadata', () => {
  expect(toSecurityFinding(alert(), 'finance')).toBeUndefined();
  const hit = alert();
  if (hit._source) hit._source['@timestamp'] = 'invalid';
  expect(toSecurityFinding(hit, 'default')).toBeUndefined();
  if (hit._source) {
    hit._source['@timestamp'] = '2026-10-13T12:00:00Z';
    hit._source['kibana.alert.severity'] = 'catastrophic';
  }
  expect(toSecurityFinding(hit, 'default')).toBeUndefined();
});

it('does not merge conflicting installation identities', () => {
  const hit = alert();
  if (hit._source?.entity_intelligence?.agent)
    hit._source.entity_intelligence.agent.id = 'another-agent';
  expect(toSecurityFinding(hit, 'default')?.agent).toBeUndefined();
});

it('supports nested alert metadata and missing optional identity fields', () => {
  const finding = toSecurityFinding(
    {
      _index: 'alerts',
      _id: 'alert',
      _source: {
        '@timestamp': '2026-10-13T12:00:00Z',
        kibana: { space_ids: ['default'], alert: { rule: { name: 'Rule' }, severity: 'medium' } },
      },
    },
    'default'
  );
  expect(finding).toMatchObject({
    severity: 'medium',
    status: 'unknown',
    kind: 'detection',
    outcome: 'unknown',
  });
  expect(finding?.actor).toBeUndefined();
  expect(finding?.ancestors).toEqual([]);
});

it('checks ancestor index and id in the same object', () => {
  const finding = toSecurityFinding(alert(), 'default');
  expect(
    finding &&
      hasSecurityAncestor(
        finding,
        'logs-entity_intelligence.security-default',
        new Set(['event-1'])
      )
  ).toBe(true);
  expect(finding && hasSecurityAncestor(finding, 'different-index', new Set(['event-1']))).toBe(
    false
  );
});

it('reports partial search results and preserves unknown totals', () => {
  expect(securitySearchPartial({ timed_out: true, hits: { hits: [] } })).toBe(true);
  expect(securitySearchPartial({ _shards: { failed: 1 }, hits: { hits: [] } })).toBe(true);
  expect(
    securitySearchPartial({ hits: { total: { value: 100, relation: 'gte' }, hits: [] } })
  ).toBe(true);
  expect(securitySearchTotal({ hits: { hits: [] } })).toBeUndefined();
  expect(securitySearchTotal({ hits: { total: { value: 8, relation: 'eq' }, hits: [] } })).toBe(8);
});

it('prefers the original event time and preserves the detection time separately', () => {
  const hit = alert();
  if (hit._source) hit._source['kibana.alert.original_time'] = '2026-10-13T11:45:00Z';
  expect(toSecurityFinding(hit, 'default')).toMatchObject({
    timestamp: '2026-10-13T11:45:00Z',
    detectedAt: '2026-10-13T12:00:00Z',
  });
});

it('falls back to a valid detection timestamp when original event time is invalid', () => {
  const hit = alert();
  if (hit._source) hit._source['kibana.alert.original_time'] = 'invalid';
  expect(toSecurityFinding(hit, 'default')).toMatchObject({ timestamp: '2026-10-13T12:00:00Z' });
});

it.each([
  { id: ['user-1', 'user-2'], name: 'James' },
  { id: 'user-1', name: ['James', 'Another user'] },
])('does not assign a sole actor from ambiguous identity fields: %p', (user) => {
  const hit = alert();
  if (hit._source) hit._source.user = user;
  expect(toSecurityFinding(hit, 'default')?.actor).toBeUndefined();
});

it.each([
  { id: ['agent-1', 'agent-2'], type: 'codex', name: 'Codex' },
  { id: 'agent-1', type: ['codex', 'cursor'], name: 'Codex' },
  { id: 'agent-1', type: 'codex', name: ['Codex', 'Cursor'] },
])('does not construct one agent from ambiguous ECS fields: %p', (agent) => {
  const hit = alert();
  if (hit._source) hit._source.agent = agent;
  expect(toSecurityFinding(hit, 'default')?.agent).toBeUndefined();
});

it('accepts unambiguous singleton identity arrays', () => {
  const hit = alert();
  if (hit._source) {
    hit._source.user = { id: ['user-1'], name: ['James'] };
    hit._source.agent = { id: ['agent-1'], type: ['codex'], name: ['Codex'] };
  }
  expect(toSecurityFinding(hit, 'default')).toMatchObject({
    actor: { id: 'user-1', name: 'James' },
    agent: { id: 'agent-1', provider: 'codex', name: 'Codex' },
  });
});

it('retains explicit scenario order and trace identifiers', () => {
  const hit = alert();
  if (hit._source?.entity_intelligence) {
    hit._source.entity_intelligence.scenario = { id: 'exercise-1', step: 4, kind: 'controlled' };
    hit._source.trace = { id: 'trace-1' };
  }
  expect(toSecurityFinding(hit, 'default')).toMatchObject({
    scenario: { id: 'exercise-1', step: 4, kind: 'controlled' },
    traceId: 'trace-1',
  });
});

it.each([
  { id: ['exercise-1', 'exercise-2'], step: 1, kind: 'controlled' },
  { id: 'exercise-1', step: [1, 2], kind: 'controlled' },
  { id: 'exercise-1', step: 1.5, kind: 'controlled' },
  { id: 'exercise-1', step: 0, kind: 'controlled' },
  { id: 'exercise-1', step: 1, kind: ['controlled', 'generated'] },
  { id: 'exercise-1', step: 1, kind: 'unrecognized' },
])('rejects ambiguous or invalid sequence metadata: %p', (scenario) => {
  const hit = alert();
  if (hit._source?.entity_intelligence) hit._source.entity_intelligence.scenario = scenario;
  expect(toSecurityFinding(hit, 'default')?.scenario).toBeUndefined();
});

it('does not attribute one trace from conflicting trace identities', () => {
  const hit = alert();
  if (hit._source) hit._source.trace = { id: ['trace-1', 'trace-2'] };
  expect(toSecurityFinding(hit, 'default')?.traceId).toBeUndefined();
});

it('projects verified invocation and policy fields from alert context, and withholds them for a conflicting agent', () => {
  const hit = alert({ version: '2' });
  const context = hit._source?.entity_intelligence;
  if (!context) throw new Error('Expected fixture context');
  context.request_id = 'request-1';
  context.invocation = {
    request_id: 'request-1',
    tool_call_id: 'native-call-1',
    tool_name: 'exec_command',
    observation_index: 'logs-codex.entity_intelligence-default',
    observation_id: 'native-doc-1',
    input_record_hash: 'a'.repeat(64),
    input_source: 'item_completed.CommandExecution.command',
    correlation: 'exact_request_id',
    input: '["node", "gateway.ts"]',
    input_redacted: false,
    input_truncated: false,
    process_exit_code: 77,
  };
  expect(toSecurityFinding(hit, 'default')).toMatchObject({
    policy: { version: '2' },
    invocation: {
      toolCallId: 'native-call-1',
      source: { id: 'native-doc-1' },
      processExitCode: 77,
    },
  });
  if (hit._source) hit._source.agent = { id: 'different-agent', type: 'codex' };
  expect(toSecurityFinding(hit, 'default')?.invocation).toBeUndefined();
});
