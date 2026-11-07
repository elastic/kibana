/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { resolve } from 'path';
import {
  CLAUDE_DESKTOP_FIXTURE_PATH,
  parseClaudeDesktopAudit,
} from './claude_desktop_session_parser';
import type {
  ClaudeDesktopAuditRecord,
  ClaudeDesktopParserContext,
} from './claude_desktop_session_parser';

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const callOne = '11111111-1111-4111-8111-111111111111';
const callTwo = '22222222-2222-4222-8222-222222222222';
const connectionOne = '33333333-3333-4333-8333-333333333333';
const connectionTwo = '44444444-4444-4444-8444-444444444444';
const context: ClaudeDesktopParserContext = {
  agentId: 'claude-desktop-install',
  spaceId: 'default',
  hashSalt: 'test-salt',
  fileHash: 'audit-file-hash',
  ingestedAt: '2026-10-14T12:01:00Z',
  localUid: 501,
  owner: { id: 'local-os:owner', name: 'james', provenance: 'local_os_account' },
  complete: true,
};
const audit = (callId = callOne, connectionId = connectionOne): ClaudeDesktopAuditRecord => {
  const input = { customer: 'Example Customer A' as const };
  const value = {
    customer: 'Example Customer A' as const,
    reference: 'DEMO-001' as const,
    classification: 'confidential-demo' as const,
  };
  const response = {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false,
  };
  const owner = { id: 'uid:501', name: 'james', provenance: 'local_os_account' as const };
  return {
    schema_version: 1,
    '@timestamp': '2026-10-14T12:00:00Z',
    event: {
      id: callId,
      dataset: 'claude_desktop.mcp_tool',
      action: 'tool_call',
      outcome: 'success',
      completed_at: '2026-10-14T12:00:00.050Z',
    },
    connection: { id: connectionId, kind: 'mcp_stdio_connection', is_chat_session: false },
    client: {
      name: 'claude-ai',
      version: '1.0.0',
      provenance: 'mcp_client_reported',
      verified: false,
    },
    local_owner: owner,
    executing_principal: { ...owner },
    human_requester: { status: 'not_observed', authenticated: false },
    service_account: { status: 'not_used' },
    conversation: { status: 'not_observed' },
    prompt: { status: 'not_observed' },
    tool: { name: 'read_customer_reference', call_id: callId, request_id: 2 },
    input: { value: input, sha256: digest(JSON.stringify(input)) },
    resource: {
      path: CLAUDE_DESKTOP_FIXTURE_PATH,
      classification: 'confidential-demo',
      content_sha256: 'a'.repeat(64),
      accessed: true,
    },
    result: { value, sha256: digest(JSON.stringify(response)), is_error: false },
    evidence: {
      source: 'local_mcp_tool_boundary',
      policy_evaluation: 'not_connected',
      kibana_integration: 'not_connected',
      assistant_reasoning_captured: false,
    },
  };
};
const parse = (rows: ClaudeDesktopAuditRecord[], options: ClaudeDesktopParserContext = context) =>
  parseClaudeDesktopAudit(
    rows.map((row) => JSON.stringify(row)),
    options
  );

it('retains exact native call and request evidence while explicitly representing an MCP connection', () => {
  const result = parse([audit()]);
  expect(result.acceptedRecords).toBe(1);
  const [tool, summary] = result.observations;
  expect(tool).toMatchObject({
    agent: { type: 'claude_desktop', name: 'Claude Desktop' },
    owner: context.owner,
    session: { id: connectionOne, kind: 'mcp_connection', is_chat_session: false },
    tool: { name: 'read_customer_reference', call: { id: callOne } },
    duration_ms: 50,
    event: { outcome: 'success', completed_at: '2026-10-14T12:00:00.050Z' },
    mcp: {
      request_id: '2',
      request_id_type: 'number',
      client: { verified: false },
      human_requester: { status: 'not_observed', authenticated: false },
      conversation: { status: 'not_observed' },
    },
    source: {
      kind: 'claude_desktop_local_session',
      native_event_id: callOne,
      observation_type: 'native_tool_completion',
      client_identity_verified: false,
    },
  });
  expect(tool.content?.input?.text).toBe('{"customer":"Example Customer A"}');
  expect(tool.content?.input?.text).not.toContain('ei-demo-sensitive');
  expect(tool.content?.output?.text).toContain('DEMO-001');
  expect(tool.mcp.resource?.path).toBe(CLAUDE_DESKTOP_FIXTURE_PATH);
  expect(tool.turn).toBeUndefined();
  expect(tool.creator).toBeUndefined();
  expect(summary.content?.title?.text).toBe('MCP connection · 33333333');
  expect(summary.content?.prompts).toBeUndefined();
  expect(summary.session).toMatchObject({
    tool_call_count: 1,
    model_tool_call_count: 0,
    native_tool_completion_count: 1,
    completion_known: false,
  });
});

it('never treats a client-reported identity or a different local account as the authenticated human', () => {
  const result = parse([audit()], { ...context, localUid: 999 });
  expect(result.observations[0].owner).toBeUndefined();
  expect(result.observations[0].mcp.human_requester).toEqual({
    status: 'not_observed',
    authenticated: false,
  });
  const forged = { ...audit(), human_requester: { status: 'observed', authenticated: true } };
  expect(parseClaudeDesktopAudit([JSON.stringify(forged)], context).rejectedRecords).toBe(1);
});

it('filters SDK test and unknown client labels instead of presenting their calls as Claude activity', () => {
  const testRecord = audit();
  testRecord.client.name = 'claude-bridge-test-client';
  const result = parse([testRecord]);
  expect(result.filteredRecords).toBe(1);
  expect(result.observations).toEqual([]);
});

it('rejects mismatched hashes, resources, outcomes and native call identifiers', () => {
  const badInput = audit();
  badInput.input.sha256 = 'b'.repeat(64);
  const badResult = audit();
  badResult.result.sha256 = 'c'.repeat(64);
  const badCall = audit();
  badCall.tool.call_id = callTwo;
  const badOutcome = audit();
  badOutcome.result.is_error = true;
  const badTime = audit();
  badTime.event.completed_at = '2026-10-13T12:00:00Z';
  const badPath = {
    ...audit(),
    resource: { ...audit().resource, path: '/never-read/real-customer-data' },
  };
  const result = parseClaudeDesktopAudit(
    [badInput, badResult, badCall, badOutcome, badTime, badPath].map((row) => JSON.stringify(row)),
    context
  );
  expect(result.rejectedRecords).toBe(6);
  expect(result.observations).toEqual([]);
});

it('publishes audited failures without inventing result content or policy blocking', () => {
  const row = audit();
  row.event.outcome = 'failure';
  row.resource.accessed = false;
  delete row.resource.content_sha256;
  row.input = {
    omitted: true,
    reason: 'unapproved_fields_not_retained',
    sha256: digest('{"path":"/not-allowed"}'),
  };
  const response = {
    content: [
      {
        type: 'text',
        text: 'Choose the available customer (Example Customer A). Other tools, paths, commands and arguments are not supported.',
      },
    ],
    isError: true,
  };
  row.result = {
    sha256: digest(JSON.stringify(response)),
    is_error: true,
    error_code: 'invalid_tool_or_arguments',
  };
  const result = parse([row]);
  expect(result.acceptedRecords).toBe(1);
  expect(result.observations[0].event.outcome).toBe('failure');
  expect(result.observations[0].content?.input).toBeUndefined();
  expect(result.observations[0].content?.output).toBeUndefined();
  expect(result.observations[0].mcp.resource?.accessed).toBe(false);
  expect(result.observations.at(-1)?.session.failure_count).toBe(1);
});

it('keeps call IDs stable on replay and groups only the same native MCP connection', () => {
  const rows = [audit(), audit(callTwo, connectionTwo)];
  const first = parse(rows);
  const replay = parse(rows, { ...context, ingestedAt: '2026-10-15T12:00:00Z' });
  expect(first.observations.map((row) => row.event.id)).toEqual(
    replay.observations.map((row) => row.event.id)
  );
  expect(first.observations.filter((row) => row.event.action === 'session')).toHaveLength(2);
  expect(parse([audit(), audit()]).duplicateRecords).toBe(1);
  const changed = audit();
  changed.tool.request_id = 3;
  const conflicted = parse([audit(), changed]);
  expect(conflicted.conflictingRecords).toBe(1);
  expect(conflicted.observations).toEqual([]);
});

it('marks partial source coverage, bounds records and filters by native activity time', () => {
  const result = parseClaudeDesktopAudit(
    ['{not-json', JSON.stringify(audit()), 'x'.repeat(32_769)],
    context
  );
  expect(result.rejectedRecords).toBe(2);
  expect(result.observations.at(-1)?.session.summary_complete).toBe(false);
  expect(
    parse([audit()], { ...context, complete: false }).observations.at(-1)?.session.summary_complete
  ).toBe(false);
  expect(
    parse([audit()], { ...context, cutoffTimestamp: Date.parse('2026-10-15T00:00:00Z') })
      .filteredRecords
  ).toBe(1);
});

it('accepts only the exact approved fixture path from this checkout', () => {
  expect(CLAUDE_DESKTOP_FIXTURE_PATH).toBe(
    resolve(
      __dirname,
      '../../../../../../..',
      'data/entity_intelligence/ei-demo-sensitive/customer_records.txt'
    )
  );
  const paths = [
    '/another-checkout/data/entity_intelligence/ei-demo-sensitive/customer_records.txt',
    `${CLAUDE_DESKTOP_FIXTURE_PATH}.backup`,
    CLAUDE_DESKTOP_FIXTURE_PATH.replace(
      '/ei-demo-sensitive/',
      '/ei-demo-sensitive/../ei-demo-sensitive/'
    ),
  ];
  for (const path of paths) {
    const row = { ...audit(), resource: { ...audit().resource, path } };
    const result = parseClaudeDesktopAudit([JSON.stringify(row)], context);
    expect(result.rejectedRecords).toBe(1);
    expect(result.observations).toEqual([]);
  }
  expect(parse([audit()]).acceptedRecords).toBe(1);
});
