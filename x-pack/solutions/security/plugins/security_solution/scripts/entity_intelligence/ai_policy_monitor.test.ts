/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { AiPolicy } from '../../common/entity_intelligence/ai_policies';
import type { GoogleAdkContext } from '../../common/entity_intelligence/google_adk';
import { publishAiPolicyEvents, scanAiPolicySource } from './ai_policy_monitor';
import { evaluateAiPolicy } from './ai_policy_evaluator';
import { buildAiPolicyDetectionRules } from './security_detection_rules';

const policy: AiPolicy = {
  id: '355531d5-70ae-4cec-9a17-1d3fbf83a21d',
  version: 1,
  name: 'Sensitive fixture',
  description: '',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: [],
  inputContains: 'ei-demo-sensitive',
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
  effectiveFrom: '2026-10-14T00:00:00Z',
  createdBy: 'james',
  updatedBy: 'james',
};
const now = '2026-10-14T01:00:00Z';
const hit = {
  _index: 'logs-cursor.entity_intelligence-default',
  _id: 'native-record',
  _source: {
    '@timestamp': now,
    event: { action: 'tool_call', outcome: 'success' },
    agent: { id: 'cursor-installation', name: 'Cursor', type: 'cursor' },
    session: { id: 'session' },
    tool: { name: 'read_file', call: { id: 'native-call' } },
    content: { input: { text: 'ei-demo-sensitive' } },
    kibana: { space_id: 'default' },
  },
};
const response = {
  timed_out: false,
  _shards: { total: 1, failed: 0, successful: 1 },
  hits: { hits: [hit], total: { value: 1, relation: 'eq' } },
};

it('scans only the activation window, preserving native evidence without a generated scenario', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(true);
  const search = jest.fn().mockResolvedValue(response);
  client.search = search;
  const result = await scanAiPolicySource(client, 'cursor', 'default', [policy], [], now);
  expect(search.mock.calls[0][0]).toMatchObject({
    index: hit._index,
    size: 5000,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: '2026-10-14T00:00:00.000Z', lte: now } } },
          { term: { 'event.action': 'tool_call' } },
        ],
      },
    },
  });
  expect(result.status.status).toBe('healthy');
  const event = evaluateAiPolicy(policy, result.observations[0], 'default');
  expect(event?.entity_intelligence.scenario).toBeUndefined();
  expect(event?.entity_intelligence.invocation?.observation_id).toBe('native-record');
});

it('reports incomplete source searches and unavailable input as partial coverage', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(true);
  client.search = jest.fn().mockResolvedValue({
    ...response,
    _shards: { total: 2, failed: 1 },
    hits: {
      total: { value: 5001, relation: 'eq' },
      hits: [{ ...hit, _source: { ...hit._source, content: undefined } }],
    },
  });
  const result = await scanAiPolicySource(client, 'cursor', 'default', [policy], [], now);
  expect(result.status.status).toBe('partial');
  expect(result.status.message).toContain('incomplete shards');
  expect(result.status.message).toContain('no captured input');
});

it('does not describe a missing index or failed query as healthy coverage', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(false);
  expect(
    (await scanAiPolicySource(client, 'cursor', 'default', [policy], [], now)).status.status
  ).toBe('unavailable');
  client.indices.exists = jest.fn().mockResolvedValue(true);
  client.search = jest.fn().mockRejectedValue(new Error('source unavailable'));
  await expect(scanAiPolicySource(client, 'cursor', 'default', [policy], [], now)).rejects.toThrow(
    'source unavailable'
  );
});

it('creates immutable source documents, ignores only version conflicts, and never writes alert indices', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(true);
  client.search = jest.fn().mockResolvedValue(response);
  const result = await scanAiPolicySource(client, 'cursor', 'default', [policy], [], now);
  const event = evaluateAiPolicy(policy, result.observations[0], 'default');
  if (!event) throw new Error('Expected fixture match.');
  const bulk = jest.fn().mockResolvedValue({
    errors: true,
    items: [{ create: { status: 201 } }, { create: { status: 409 } }],
  });
  client.bulk = bulk;
  expect(await publishAiPolicyEvents(client, 'default', [event, event])).toBe(1);
  expect(bulk.mock.calls[0][0].operations[0]).toEqual({
    create: { _index: 'logs-entity_intelligence.security-default', _id: event.event.id },
  });
  bulk.mockResolvedValue({ errors: true, items: [{ create: { status: 403 } }] });
  await expect(publishAiPolicyEvents(client, 'default', [event])).rejects.toThrow(
    'Source event indexing failed.'
  );
});

it('builds four real query rules with severity-specific monitor conditions and no response actions', () => {
  const rules = buildAiPolicyDetectionRules('marketing');
  expect(rules.map((rule) => rule.severity)).toEqual(['low', 'medium', 'high', 'critical']);
  for (const rule of rules) {
    expect(rule.index).toEqual(['logs-entity_intelligence.security-marketing']);
    expect(rule.query).toContain('event.action: "ai_policy_match"');
    expect(rule.query).toContain('entity_intelligence.control.mode: "monitor"');
    expect(rule.query).toContain(`entity_intelligence.control.severity: "${rule.severity}"`);
    expect(rule.actions).toEqual([]);
    expect(rule.enabled).toBe(true);
  }
});

it('does not advertise monitoring when no enabled policy targets the source', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  const exists = jest.fn();
  client.indices.exists = exists;
  const result = await scanAiPolicySource(client, 'codex', 'default', [policy], [], now);
  expect(result.status.status).toBe('unavailable');
  expect(result.status.message).toBe('No enabled policies target this provider.');
  expect(exists).not.toHaveBeenCalled();
});

it('detects a Claude Desktop MCP call while retaining only local ownership attribution', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(true);
  const claudeHit = {
    ...hit,
    _index: 'logs-claude_desktop.entity_intelligence-default',
    _source: {
      ...hit._source,
      agent: { id: 'claude-desktop-installation', name: 'Claude Desktop', type: 'claude_desktop' },
      session: { id: 'mcp-connection' },
      tool: { name: 'read_customer_reference', call: { id: 'native-mcp-call' } },
      owner: { id: 'uid:501', name: 'james', provenance: 'local_os_account' },
      content: { input: { text: '{"customer":"Example Customer A"}' } },
    },
  };
  client.search = jest.fn().mockResolvedValue({
    ...response,
    hits: { hits: [claudeHit], total: { value: 1, relation: 'eq' } },
  });
  const claudePolicy: AiPolicy = {
    ...policy,
    providers: ['claude_desktop'],
    activityType: 'restricted_tool_use',
    toolNames: ['read_customer_reference'],
    inputContains: '',
  };
  const scan = await scanAiPolicySource(
    client,
    'claude_desktop',
    'default',
    [claudePolicy],
    [],
    now
  );
  expect(scan.status.status).toBe('healthy');
  expect(scan.observations).toHaveLength(1);
  expect(scan.observations[0]).toMatchObject({
    provider: 'claude_desktop',
    sessionId: 'mcp-connection',
    actorProvenance: 'local_os_account',
    toolCallId: 'native-mcp-call',
    outcome: 'success',
  });
  expect(scan.observations[0].conversationId).toBeUndefined();
  const event = evaluateAiPolicy(claudePolicy, scan.observations[0], 'default');
  expect(event?.entity_intelligence.actor_provenance).toBe('local_os_account');
  expect(event?.entity_intelligence.invocation?.observation_id).toBe('native-record');
  expect(event?.entity_intelligence.scenario).toBeUndefined();
});

it('scans Google native completions and evaluates saved Elastic policies independently of cloud matches', async () => {
  const client = new Client({ node: 'http://localhost:9200' });
  client.indices.exists = jest.fn().mockResolvedValue(true);
  const context: GoogleAdkContext = {
    project_id: 'project',
    service_name: 'support-agent',
    revision: 'support-agent-00001',
    run_id: 'run-1',
    trace_id: 'a'.repeat(32),
    span_id: 'b'.repeat(16),
    requester: {
      email: 'requester@example.com',
      subject: 'google-subject',
      authenticated: true,
      principal_type: 'google_account',
      provenance: 'google_signed_id_token_verified_by_application',
      human_identity: 'account_level_only',
    },
    runtime: {
      email: 'runtime@project.iam.gserviceaccount.com',
      provenance: 'cloud_run_metadata_service_identity',
    },
    resources: [],
    audit_matches: [],
    source_policy: {
      id: 'different-cloud-policy',
      name: 'Cloud monitor',
      revision: 3,
      mode: 'monitor',
      enforced: false,
      matches: [
        {
          tool_call_id: 'another-call',
          rule_id: 'cloud-rule',
          title: 'Source-only export condition',
          severity: 'critical',
          reason: 'Cloud evidence does not create an Elastic match.',
        },
      ],
    },
  };
  const googleHit = {
    ...hit,
    _index: 'logs-google_adk.entity_intelligence-default',
    _source: {
      ...hit._source,
      agent: { id: 'google-support-agent', name: 'Google support agent', type: 'google_adk' },
      tool: { name: 'read_support_case', call: { id: 'native-google-call' } },
      source: { kind: 'google_adk_cloud_run', observation_type: 'native_tool_completion' },
      content: { input: { text: '{"case_id":"CASE-001"}' } },
      google_adk: context,
    },
  };
  const search = jest.fn().mockResolvedValue({
    ...response,
    hits: { hits: [googleHit], total: { value: 1, relation: 'eq' } },
  });
  client.search = search;
  const googlePolicy: AiPolicy = {
    ...policy,
    providers: ['google_adk'],
    toolNames: ['export_case_summary'],
    activityType: 'unapproved_export',
    inputContains: '',
  };
  const scan = await scanAiPolicySource(client, 'google_adk', 'default', [googlePolicy], [], now);
  expect(scan.status.status).toBe('healthy');
  expect(search.mock.calls[0][0].index).toBe(googleHit._index);
  expect(search.mock.calls[0][0]._source).toContain('google_adk');
  expect(scan.observations).toHaveLength(1);
  expect(scan.observations[0]).toMatchObject({
    actor: { name: 'requester@example.com' },
    runtimePrincipal: 'runtime@project.iam.gserviceaccount.com',
    toolCallId: 'native-google-call',
  });
  expect(evaluateAiPolicy(googlePolicy, scan.observations[0], 'default')).toBeUndefined();
});
