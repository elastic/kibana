/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCodexSessionsQuery, buildCodexToolsQuery } from './codex_queries';
import { parseCodexSessions, parseCodexTools } from './codex_model';
import type { CodexDocument, CodexSearchResponse } from './codex_types';

const document: CodexDocument = {
  '@timestamp': '2026-10-12T10:00:00Z',
  agent: { id: 'cursor-install', name: 'Cursor', type: 'cursor' },
  kibana: { space_id: 'blue' },
  source: { kind: 'cursor_local_session', file_hash: 'hash', schema_version: 1 },
  event: { action: 'session', id: 'session-event', outcome: 'unknown' },
  session: {
    id: 'session-one',
    start: '2026-10-12T09:00:00Z',
    last_seen: '2026-10-12T10:00:00Z',
    tool_call_count: 0,
    failure_count: 0,
    success_count: 0,
    unknown_count: 0,
    tools: [],
  },
};
const response = (doc: CodexDocument): CodexSearchResponse => ({
  hits: {
    total: { value: 1, relation: 'eq' },
    hits: [{ _id: 'one', _index: 'logs-cursor.entity_intelligence-blue', _source: doc }],
  },
});

it('uses exact provider and space indices in session and tool queries', () => {
  expect(buildCodexSessionsQuery('blue', 'cursor').params.index).toBe(
    'logs-cursor.entity_intelligence-blue'
  );
  expect(buildCodexSessionsQuery('blue').params.index).toBe('logs-codex.entity_intelligence-blue');
  const tools = buildCodexToolsQuery('blue', 'cursor-install', 'session-one', 'cursor');
  expect(tools.params.index).toBe('logs-cursor.entity_intelligence-blue');
  expect(tools.params.query).toMatchObject({
    bool: {
      filter: expect.arrayContaining([
        { term: { 'kibana.space_id': 'blue' } },
        { term: { 'agent.id': 'cursor-install' } },
        { term: { 'session.id': 'session-one' } },
      ]),
    },
  });
});

it('rejects records from other spaces and providers even when an index responds', () => {
  expect(parseCodexSessions(response(document), 'blue', 'cursor')).toEqual([
    expect.objectContaining({ provider: 'cursor', agentId: 'cursor-install' }),
  ]);
  expect(parseCodexSessions(response(document), 'blue', 'codex')).toEqual([]);
  expect(parseCodexSessions(response(document), 'red', 'cursor')).toEqual([]);
  const tool: CodexDocument = {
    ...document,
    event: { action: 'tool_call', id: 'tool', outcome: 'unknown' },
    tool: { name: 'read_file_v2', call: { id: 'call-one' } },
  };
  expect(
    parseCodexTools(response(tool), 'blue', 'cursor-install', 'session-one', 'cursor')
  ).toHaveLength(1);
  expect(parseCodexTools(response(tool), 'blue', 'cursor-install', 'session-one', 'codex')).toEqual(
    []
  );
  expect(parseCodexTools(response(tool), 'blue', 'other-install', 'session-one', 'cursor')).toEqual(
    []
  );
});
