/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCodexContentQuery,
  buildCodexSessionsQuery,
  CODEX_SOURCE_FIELDS,
} from './codex_queries';
import { parseCodexSessions, parseCodexTools } from './codex_model';
import type { CodexDocument, CodexSearchResponse } from './codex_types';
import { externalAgentGrouping, externalAgentGroupIdLabel } from './external_agent_provider';
import { findingMatchesToolEvent } from './security_graph_model';
import type { SecurityFinding } from '../security_findings/types';
import { buildUnifiedIdentityRows } from '../unified_identity_inventory_model';
import { buildExecutiveBriefAgentSnapshot } from '../executive_brief_agents';

const index = 'logs-claude_desktop.entity_intelligence-blue';
const hash = 'a'.repeat(64);
const document: CodexDocument = {
  '@timestamp': '2026-10-14T10:00:00Z',
  agent: { id: 'claude-desktop-bridge', name: 'Claude Desktop', type: 'claude_desktop' },
  kibana: { space_id: 'blue' },
  source: {
    kind: 'claude_desktop_local_session',
    file_hash: hash,
    record_hash: hash,
    schema_version: 1,
  },
  owner: { id: 'uid:501', name: 'james', provenance: 'local_os_account' },
  event: { action: 'session', id: 'connection-record', outcome: 'unknown' },
  session: {
    id: 'connection-uuid',
    kind: 'mcp_connection',
    is_chat_session: false,
    start: '2026-10-14T09:00:00Z',
    last_seen: '2026-10-14T10:00:00Z',
    tool_call_count: 1,
    failure_count: 0,
    success_count: 1,
    unknown_count: 0,
    summary_complete: true,
    tools: [
      {
        name: 'read_customer_reference',
        count: 1,
        failure_count: 0,
        success_count: 1,
        unknown_count: 0,
      },
    ],
  },
};
const response = (doc: CodexDocument): CodexSearchResponse => ({
  hits: {
    total: { value: 1, relation: 'eq' },
    hits: [{ _id: 'native-document', _index: index, _source: doc }],
  },
});
const tool: CodexDocument = {
  ...document,
  event: { id: 'call-uuid', action: 'tool_call', outcome: 'success' },
  tool: { name: 'read_customer_reference', call: { id: 'call-uuid' } },
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    input: {
      kind: 'arguments',
      text: '{"customer":"Example Customer A"}',
      source: 'claude_desktop.mcp.input.value',
      redacted: false,
      truncated: false,
      recordHash: hash,
    },
    output: {
      text: '{"reference":"DEMO-001"}',
      source: 'claude_desktop.mcp.result.value',
      redacted: false,
      truncated: false,
    },
  },
};

it('loads only the matching provider, space and explicit MCP connection records', () => {
  expect(buildCodexSessionsQuery('blue', 'claude_desktop').params.index).toBe(index);
  const [session] = parseCodexSessions(response(document), 'blue', 'claude_desktop');
  expect(session).toMatchObject({
    provider: 'claude_desktop',
    id: 'connection-uuid',
    owner: { name: 'james', provenance: 'local_os_account' },
  });
  expect(session.creator).toBeUndefined();
  expect(session.model).toBeUndefined();
  expect(session.prompts).toBeUndefined();
  expect(externalAgentGrouping('claude_desktop', true)).toBe('MCP connections');
  expect(externalAgentGroupIdLabel('claude_desktop')).toBe('MCP connection ID');
  expect(parseCodexSessions(response(document), 'red', 'claude_desktop')).toEqual([]);
  expect(parseCodexSessions(response(document), 'blue', 'codex')).toEqual([]);
  expect(
    parseCodexSessions(
      response({ ...document, session: { ...document.session, is_chat_session: true } }),
      'blue',
      'claude_desktop'
    )
  ).toEqual([]);
  expect(
    parseCodexSessions(
      response({ ...document, session: { ...document.session, kind: undefined } }),
      'blue',
      'claude_desktop'
    )
  ).toEqual([]);
});

it('retrieves bounded recorded results only in the exact content query and filters credentials', () => {
  expect(CODEX_SOURCE_FIELDS).not.toContain('content.output.text');
  const query = buildCodexContentQuery(
    'blue',
    document.agent.id,
    document.session.id,
    'native-document',
    'tool_call',
    'claude_desktop'
  );
  expect(query.params.index).toBe(index);
  expect(query.params._source).toContain('content.output.text');
  expect(query.params.query).toMatchObject({
    bool: { filter: expect.arrayContaining([{ ids: { values: ['native-document'] } }]) },
  });
  const [event] = parseCodexTools(
    response(tool),
    'blue',
    document.agent.id,
    document.session.id,
    'claude_desktop'
  );
  expect(event.output?.text).toBe('{"reference":"DEMO-001"}');
  const dirty: CodexDocument = {
    ...tool,
    content: {
      ...tool.content,
      mode: 'redacted_local',
      output: {
        text: 'password: "never-display-this-123"',
        source: 'claude_desktop.mcp.result.value',
        redacted: false,
        truncated: false,
      },
    },
  };
  expect(
    parseCodexTools(
      response(dirty),
      'blue',
      document.agent.id,
      document.session.id,
      'claude_desktop'
    )[0].output?.text
  ).not.toContain('never-display-this-123');
  expect(
    parseCodexTools(response(tool), 'blue', document.agent.id, 'other-connection', 'claude_desktop')
  ).toEqual([]);
});

it('binds a detection to the actual MCP call without treating a successful result as blocking', () => {
  const [event] = parseCodexTools(
    response(tool),
    'blue',
    document.agent.id,
    document.session.id,
    'claude_desktop'
  );
  const finding: SecurityFinding = {
    id: 'finding',
    timestamp: document['@timestamp'],
    title: 'Restricted customer records',
    severity: 'high',
    status: 'open',
    kind: 'detection',
    outcome: 'unknown',
    rule: { name: 'Policy match' },
    source: { index: 'alerts', id: 'alert-id' },
    ancestors: [],
    entityIds: [],
    agent: { id: event.agentId, provider: 'claude_desktop', sessionId: event.sessionId },
    invocation: {
      toolCallId: event.id,
      toolName: event.toolName,
      source: event.source,
      inputRecordHash: hash,
      inputSource: 'claude_desktop.mcp.input.value',
      correlation: 'exact_native_observation',
      input: event.input?.text ?? '',
      inputRedacted: false,
      inputTruncated: false,
    },
  };
  expect(findingMatchesToolEvent(finding, event)).toBe(true);
  expect(findingMatchesToolEvent(finding, { ...event, provider: 'cursor' })).toBe(false);
  expect(findingMatchesToolEvent(finding, { ...event, sessionId: 'other-connection' })).toBe(false);
  expect(findingMatchesToolEvent(finding, { ...event, id: 'other-call' })).toBe(false);
  expect(finding.outcome).toBe('unknown');
});

it('preserves MCP connection units and attribution gaps in inventory and brief evidence', () => {
  const sessions = parseCodexSessions(response(document), 'blue', 'claude_desktop');
  const [row] = buildUnifiedIdentityRows({
    entities: [],
    agents: [],
    codexSessions: [],
    claudeDesktopSessions: sessions,
  });
  expect(row).toMatchObject({
    name: 'Claude Desktop',
    source: 'claude_desktop',
    activity: { count: 1, unit: 'connections' },
    target: { source: 'claude_desktop' },
  });
  const empty = { sessions: [], isLoading: false, unavailable: false, partial: false };
  const brief = buildExecutiveBriefAgentSnapshot({
    codex: empty,
    cursor: empty,
    claudeDesktop: { ...empty, sessions },
    builder: {
      agents: [],
      isLoading: false,
      status: 'empty',
      definitionsStatus: 'empty',
      activityStatus: 'empty',
    },
  });
  expect(brief.providers.find((provider) => provider.provider === 'claude_desktop')).toMatchObject({
    grouping: 'mcp_connection',
    sessions: 1,
    evaluatedSessions: 0,
  });
  expect(brief.limitations).toContain('mcp_connection_not_chat');
  expect(brief.changedSessions).toEqual([]);
});
