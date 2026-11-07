/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AiPolicy } from '../../common/entity_intelligence/ai_policies';
import type { GoogleAdkContext } from '../../common/entity_intelligence/google_adk';
import {
  evaluateAiPolicy,
  parseAgentBuilderPolicyObservations,
  parseGoogleAdkPolicyObservation,
  parseLocalPolicyObservation,
  resolveAiPolicyConversationActor,
} from './ai_policy_evaluator';
import type { AiPolicyObservation, NativePolicyHit } from './ai_policy_evaluator';

const policy: AiPolicy = {
  id: '355531d5-70ae-4cec-9a17-1d3fbf83a21d',
  version: 1,
  name: 'Monitor sensitive fixture reads',
  description: 'Record calls mentioning a controlled test fixture.',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor', 'agent_builder'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: ['read_file'],
  inputContains: 'ei-demo-sensitive',
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
  effectiveFrom: '2026-10-14T00:00:00Z',
  createdBy: 'james',
  updatedBy: 'james',
};
const observation: AiPolicyObservation = {
  provider: 'cursor',
  timestamp: '2026-10-14T01:00:00Z',
  agent: { id: 'cursor-installation', name: 'Cursor' },
  sessionId: 'composer',
  actor: { id: 'local-id', name: 'james' },
  actorProvenance: 'local_os_account',
  toolName: 'read_file',
  toolCallId: 'call-1',
  source: { index: 'logs-cursor.entity_intelligence-default', id: 'doc-1' },
  input: '{"path":"/tmp/EI-DEMO-SENSITIVE.txt"}',
  inputSource: 'native record',
  inputHash: 'a'.repeat(64),
  inputRedacted: false,
  inputTruncated: false,
  outcome: 'success',
};
const localHit = (): NativePolicyHit => ({
  _index: observation.source.index,
  _id: 'doc-1',
  _source: {
    '@timestamp': observation.timestamp,
    event: { action: 'tool_call', outcome: 'success' },
    agent: { ...observation.agent, type: 'cursor' },
    session: { id: observation.sessionId },
    tool: { name: 'read_file', call: { id: 'call-1' } },
    source: { record_hash: 'b'.repeat(64) },
    owner: { ...observation.actor, provenance: 'local_os_account' },
    content: { input: { text: observation.input, source: 'cursor local input' } },
    kibana: { space_id: 'default' },
  },
});
const googleContext: GoogleAdkContext = {
  project_id: 'project',
  service_name: 'support-agent',
  revision: 'support-agent-00001',
  run_id: 'run-1',
  trace_id: 'a'.repeat(32),
  span_id: 'b'.repeat(16),
  requester: {
    email: 'requester@example.com',
    subject: 'google-subject-1',
    authenticated: true,
    principal_type: 'google_account',
    provenance: 'google_signed_id_token_verified_by_application',
    human_identity: 'account_level_only',
  },
  runtime: {
    email: 'runtime@project.iam.gserviceaccount.com',
    provenance: 'cloud_run_metadata_service_identity',
  },
  owner: {
    email: 'owner@example.com',
    recorded_by: 'administrator@example.com',
    effective_from: '2026-10-14T00:00:00Z',
    provenance: 'operator_declared',
  },
  resources: [
    {
      uri: 'gs://customer-data/customers/example-a.json',
      generation: '1234',
      sha256: 'c'.repeat(64),
      tool_call_id: 'call-1',
      content_verified: true,
    },
  ],
  audit_matches: [],
  source_policy: {
    id: 'cloud-policy',
    name: 'Cloud monitor',
    revision: 1,
    mode: 'monitor',
    enforced: false,
    matches: [],
  },
};
const googleHit = (): NativePolicyHit => ({
  ...localHit(),
  _index: 'logs-google_adk.entity_intelligence-default',
  _source: {
    ...localHit()._source,
    agent: { id: 'google-support-agent', name: 'Google support agent', type: 'google_adk' },
    tool: { name: 'read_customer_reference', call: { id: 'call-1' } },
    source: {
      kind: 'google_adk_cloud_run',
      observation_type: 'native_tool_completion',
      record_hash: 'd'.repeat(64),
    },
    content: { input: { text: '{"customer":"Example Customer A"}' } },
    google_adk: googleContext,
  },
});
const span = (
  id: string,
  parent: string | undefined,
  kind: 'AGENT' | 'TOOL' | 'CHAIN',
  trace = 'trace'
): NativePolicyHit => ({
  _index: '.ds-traces-agent_builder.otel-default-2026.10.14-000001',
  _id: `doc-${trace}-${id}`,
  _source: {
    '@timestamp': observation.timestamp,
    trace_id: trace,
    span_id: id,
    parent_span_id: parent,
    attributes: {
      'gen_ai.operation.name': kind === 'TOOL' ? 'execute_tool' : 'invoke_agent',
      'elastic.inference.span.kind': kind,
      ...(kind === 'AGENT' ? { 'gen_ai.agent.id': id } : {}),
      ...(kind === 'TOOL'
        ? {
            'gen_ai.tool.name': 'read_file',
            'gen_ai.tool.call.id': `call-${id}`,
            'gen_ai.tool.call.arguments': '{"path":"ei-demo-sensitive"}',
          }
        : {}),
    },
    status: { code: 'Ok' },
  },
});

it('matches literal input case-insensitively and exact tool names with AND semantics', () => {
  expect(evaluateAiPolicy(policy, observation, 'default')).toBeDefined();
  expect(
    evaluateAiPolicy(policy, { ...observation, toolName: 'Read_File' }, 'default')
  ).toBeUndefined();
  expect(
    evaluateAiPolicy(policy, { ...observation, input: 'read another file' }, 'default')
  ).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...policy, inputContains: '.*' }, observation, 'default')
  ).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...policy, inputContains: '', toolNames: [] }, observation, 'default')
  ).toBeUndefined();
});

it('honors provider scope, disablement and the revision effective time', () => {
  expect(evaluateAiPolicy({ ...policy, enabled: false }, observation, 'default')).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...policy, providers: ['agent_builder'] }, observation, 'default')
  ).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...policy, effectiveFrom: '2026-10-14T01:00:01Z' }, observation, 'default')
  ).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...policy, effectiveFrom: 'invalid' }, observation, 'default')
  ).toBeUndefined();
});

it('records immutable revision and exact source without asserting prevention or successful file access', () => {
  const event = evaluateAiPolicy(policy, observation, 'default');
  expect(event?.entity_intelligence.control).toMatchObject({
    id: policy.id,
    version: '1',
    mode: 'monitor',
    decision: 'deny',
    outcome: 'unknown',
    severity: 'high',
  });
  expect(event?.entity_intelligence.invocation).toMatchObject({
    correlation: 'exact_native_observation',
    tool_call_id: 'call-1',
    observation_index: observation.source.index,
    observation_id: 'doc-1',
    input_record_hash: 'a'.repeat(64),
  });
  const control = event?.entity_intelligence.control;
  expect(control?.policy_sha256).toBe(
    createHash('sha256').update(JSON.stringify(control?.definition)).digest('hex')
  );
  expect(control?.definition).toMatchObject({ policy_id: policy.id, policy_version: 1 });
  expect(event?.event.type).toEqual(['access']);
  expect(event?.host).toBeUndefined();
});

it('uses stable dedup IDs per policy revision and source document, independent of repeated imports', () => {
  const first = evaluateAiPolicy(policy, observation, 'default');
  const again = evaluateAiPolicy(policy, { ...observation, outcome: 'failure' }, 'default');
  expect(first?.event.id).toBe(again?.event.id);
  expect(evaluateAiPolicy({ ...policy, version: 2 }, observation, 'default')?.event.id).not.toBe(
    first?.event.id
  );
  expect(
    evaluateAiPolicy(
      policy,
      { ...observation, source: { ...observation.source, id: 'different' } },
      'default'
    )?.event.id
  ).not.toBe(first?.event.id);
});

it('matches only visible bounded input and supports tool-name-only policies when input is missing', () => {
  expect(evaluateAiPolicy(policy, { ...observation, input: undefined }, 'default')).toBeUndefined();
  expect(
    evaluateAiPolicy(
      { ...policy, inputContains: '' },
      { ...observation, input: undefined },
      'default'
    )
  ).toBeDefined();
  const event = evaluateAiPolicy(policy, { ...observation, inputTruncated: true }, 'default');
  expect(event?.entity_intelligence.control?.reason).toContain('Only the visible');
});

it('parses Cursor identity honestly, preserves native input record hash and redacts credentials', () => {
  const hit = localHit();
  if (hit._source?.content?.input)
    hit._source.content.input.text = 'cat ei-demo-sensitive --password="test-secret-12345"';
  const parsed = parseLocalPolicyObservation(hit, 'cursor', 'default');
  expect(parsed).toMatchObject({
    actor: { name: 'james' },
    actorProvenance: 'local_os_account',
    inputHash: 'b'.repeat(64),
    inputRedacted: true,
  });
  expect(parsed?.input).not.toContain('test-secret-12345');
  expect(parsed?.input).toContain('ei-demo-sensitive');
  expect(parseLocalPolicyObservation(hit, 'codex', 'default')).toBeUndefined();
  expect(parseLocalPolicyObservation(hit, 'cursor', 'other-space')).toBeUndefined();
  expect(
    parseLocalPolicyObservation({ ...hit, _source: undefined }, 'cursor', 'default')
  ).toBeUndefined();
});

it('keeps Google requester, runtime account and declared owner separate on exact native findings', () => {
  const parsed = parseGoogleAdkPolicyObservation(googleHit(), 'default');
  expect(parsed).toMatchObject({
    provider: 'google_adk',
    actor: { id: 'google-subject-1', name: 'requester@example.com' },
    actorProvenance: 'authenticated_user',
    actorSource: 'google_signed_id_token_verified_by_application',
    runtimePrincipal: 'runtime@project.iam.gserviceaccount.com',
    requestId: 'run-1',
    toolCallId: 'call-1',
    resourceUri: googleContext.resources[0].uri,
    inputHash: 'd'.repeat(64),
  });
  if (!parsed) throw new Error('Expected Google observation.');
  const googlePolicy: AiPolicy = {
    ...policy,
    providers: ['google_adk'],
    toolNames: ['read_customer_reference'],
    inputContains: '',
  };
  const event = evaluateAiPolicy(googlePolicy, parsed, 'default');
  expect(event?.user?.name).toBe('requester@example.com');
  expect(event?.entity_intelligence.activity.target).toBe(googleContext.resources[0].uri);
  expect(event?.entity_intelligence.invocation).toMatchObject({
    actor_source: 'google_signed_id_token_verified_by_application',
    runtime_principal: 'runtime@project.iam.gserviceaccount.com',
    request_id: 'run-1',
    trace_id: 'a'.repeat(32),
    span_id: 'b'.repeat(16),
    tool_call_id: 'call-1',
    observation_index: 'logs-google_adk.entity_intelligence-default',
    observation_id: 'doc-1',
    correlation: 'exact_native_observation',
  });
  expect(event?.entity_intelligence.control?.id).toBe(policy.id);
  expect(event?.entity_intelligence.control?.mode).toBe('monitor');
  expect(event?.entity_intelligence.control?.outcome).toBe('unknown');
  expect(event?.entity_intelligence.invocation?.operation_outcome).toBe('success');
  expect(event?.entity_intelligence.scenario).toBeUndefined();
  expect(
    evaluateAiPolicy({ ...googlePolicy, effectiveFrom: '2026-10-14T02:00:00Z' }, parsed, 'default')
  ).toBeUndefined();
});

it('does not evaluate cloud source-policy summaries, other spaces or unverified requester records', () => {
  const hit = googleHit();
  expect(parseGoogleAdkPolicyObservation(hit, 'another-space')).toBeUndefined();
  for (const source of [
    { ...hit._source, event: { action: 'session' } },
    { ...hit._source, source: { kind: 'google_adk_cloud_run', observation_type: 'policy_match' } },
    { ...hit._source, google_adk: undefined },
    { ...hit._source, google_adk: { ...googleContext, revision: '' } },
  ])
    expect(parseGoogleAdkPolicyObservation({ ...hit, _source: source }, 'default')).toBeUndefined();
  const invalidIdentity = { ...googleContext, requester: { ...googleContext.requester } };
  Object.assign(invalidIdentity.requester, { provenance: 'operator_declared' });
  expect(
    parseGoogleAdkPolicyObservation(
      { ...hit, _source: { ...hit._source, google_adk: invalidIdentity } },
      'default'
    )
  ).toBeUndefined();
});

it('ties resources only to the exact Google tool call and evaluates actual export arguments', () => {
  const hit = googleHit();
  const parsed = parseGoogleAdkPolicyObservation(
    {
      ...hit,
      _source: {
        ...hit._source,
        tool: { name: 'export_case_summary', call: { id: 'call-export' } },
        content: { input: { text: '{"summary":"The customer reference is DEMO-001"}' } },
      },
    },
    'default'
  );
  expect(parsed?.resourceUri).toBeUndefined();
  if (!parsed) throw new Error('Expected Google export observation.');
  const event = evaluateAiPolicy(
    {
      ...policy,
      providers: ['google_adk'],
      activityType: 'unapproved_export',
      toolNames: ['export_case_summary'],
      inputContains: 'DEMO-001',
    },
    parsed,
    'default'
  );
  expect(event?.entity_intelligence.invocation?.tool_call_id).toBe('call-export');
  expect(event?.entity_intelligence.activity.target).toBe('DEMO-001');
  expect(event?.event.outcome).toBe('success');
});

it('never labels an authenticated Google service-account requester as a human user', () => {
  const hit = googleHit();
  const parsed = parseGoogleAdkPolicyObservation(
    {
      ...hit,
      _source: {
        ...hit._source,
        google_adk: {
          ...googleContext,
          requester: {
            ...googleContext.requester,
            email: 'requester@project.iam.gserviceaccount.com',
            principal_type: 'service_account',
          },
        },
      },
    },
    'default'
  );
  expect(parsed?.actorProvenance).toBe('source_identity');
  expect(parsed?.actor?.name).toBe('requester@project.iam.gserviceaccount.com');
  expect(parsed?.actorSource).toBe('google_signed_id_token_verified_by_application');
});

it('binds nested agent tools to the nearest AGENT span and treats CHAIN spans only as ancestors', () => {
  const parent = span('parent-agent', undefined, 'AGENT');
  const child = span('child-agent', 'parent-agent', 'AGENT');
  const chain = span('chain', 'child-agent', 'CHAIN');
  const tool = span('tool', 'chain', 'TOOL');
  const result = parseAgentBuilderPolicyObservations(
    [tool],
    [parent, child, chain],
    [{ id: 'child-agent', name: 'Child agent' }]
  );
  expect(result.unattributed).toBe(0);
  expect(result.observations[0]).toMatchObject({
    agent: { id: 'child-agent', name: 'Child agent' },
    sessionId: 'trace:child-agent',
    invocationSpanId: 'child-agent',
    spanId: 'tool',
    toolCallId: 'call-tool',
    actorProvenance: 'unknown',
  });
});

it('never binds missing, cyclic, ambiguous or cross-trace ancestors to an unrelated agent', () => {
  const tool = span('tool', 'agent', 'TOOL');
  expect(
    parseAgentBuilderPolicyObservations(
      [tool],
      [span('agent', undefined, 'AGENT', 'another-trace')],
      []
    ).unattributed
  ).toBe(1);
  const cycle = span('agent', 'tool', 'CHAIN');
  expect(parseAgentBuilderPolicyObservations([tool], [cycle], []).unattributed).toBe(1);
  expect(
    parseAgentBuilderPolicyObservations(
      [tool],
      [span('agent', undefined, 'AGENT'), span('agent', 'another-parent', 'AGENT')],
      []
    ).unattributed
  ).toBe(1);
});

it('uses the recorded authenticated initiating user and conversation from traced ancestors', () => {
  const agent = span('agent', undefined, 'AGENT');
  if (agent._source?.attributes)
    Object.assign(agent._source.attributes, {
      'elastic.agent_builder.attribution.source': 'kibana_authc',
      'elastic.agent_builder.initiating_actor.id': 'uid',
      'elastic.agent_builder.initiating_actor.name': 'James',
      'gen_ai.conversation.id': 'conversation-id',
    });
  const result = parseAgentBuilderPolicyObservations([span('tool', 'agent', 'TOOL')], [agent], []);
  expect(result.observations[0]).toMatchObject({
    actor: { id: 'uid', name: 'James' },
    actorProvenance: 'authenticated_user',
    conversationId: 'conversation-id',
  });
});

it('does not use an enclosing agent when the nearest nested agent identity is unavailable', () => {
  const child = span('child', 'parent', 'AGENT');
  if (child._source?.attributes) delete child._source.attributes['gen_ai.agent.id'];
  expect(
    parseAgentBuilderPolicyObservations(
      [span('tool', 'child', 'TOOL')],
      [span('parent', undefined, 'AGENT'), child],
      []
    ).unattributed
  ).toBe(1);
});

it('preserves a traced pseudonymous user and trace ID without guessing a name', () => {
  const tool = span('tool', 'agent', 'TOOL');
  if (tool._source?.attributes)
    Object.assign(tool._source.attributes, {
      'elastic.agent_builder.attribution.source': 'kibana_authc',
      'elastic.agent_builder.attribution.status': 'partial',
      'elastic.agent_builder.initiating_actor.hash': '4ffb7a42e67ff5b3',
      'elastic.agent_builder.initiating_actor.source': 'kibana_authc',
      'elastic.agent_builder.caller.principal.type': 'user',
    });
  const parsed = parseAgentBuilderPolicyObservations(
    [tool],
    [span('agent', undefined, 'AGENT')],
    []
  ).observations[0];
  const event = evaluateAiPolicy(policy, parsed, 'default');
  expect(event?.trace).toEqual({ id: 'trace' });
  expect(event?.user).toEqual({ hash: '4ffb7a42e67ff5b3' });
  expect(event?.entity_intelligence.invocation).toMatchObject({
    actor_hash: '4ffb7a42e67ff5b3',
    actor_source: 'native_trace',
  });
});

it('resolves only the exact round author whose ID matches the authenticated actor hash', () => {
  const hashed: AiPolicyObservation = {
    ...observation,
    provider: 'agent_builder',
    actor: undefined,
    actorProvenance: 'source_identity',
    traceId: 'trace',
    conversationId: 'conversation',
    actorEvidence: {
      hash: createHash('sha256').update('profile-james').digest('hex').slice(0, 16),
      source: 'kibana_authc',
      status: 'partial',
      callerType: 'user',
      hasApiKey: false,
    },
  };
  const round = {
    id: 'round',
    trace_id: 'trace',
    author: { id: 'profile-james', username: 'James' },
  };
  const conversation = { id: 'conversation', agent_id: hashed.agent.id, rounds: [round] };
  const resolved = resolveAiPolicyConversationActor(hashed, conversation);
  expect(resolved.actor).toEqual({ id: 'profile-james', name: 'James' });
  expect(
    evaluateAiPolicy(policy, resolved, 'default')?.entity_intelligence.invocation
  ).toMatchObject({ actor_source: 'conversation_round_author', actor_round_id: 'round' });
  for (const changed of [
    { ...conversation, id: 'different' },
    { ...conversation, agent_id: 'different' },
    { ...conversation, rounds: [round, round] },
    { ...conversation, rounds: [{ ...round, trace_id: 'different' }] },
    { ...conversation, rounds: [{ ...round, author: { id: 'other-author', username: 'James' } }] },
    { ...conversation, rounds: [{ ...round, origin: { type: 'scheduled_task' } }] },
  ])
    expect(resolveAiPolicyConversationActor(hashed, changed).actor).toBeUndefined();
  expect(
    resolveAiPolicyConversationActor(
      {
        ...hashed,
        actorEvidence: {
          ...hashed.actorEvidence,
          source: 'kibana_authc',
          callerType: 'api_key',
          hasApiKey: true,
        },
      },
      conversation
    ).actor
  ).toBeUndefined();
});
