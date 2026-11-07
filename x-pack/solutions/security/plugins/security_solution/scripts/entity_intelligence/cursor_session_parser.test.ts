/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCursorSession } from './cursor_session_parser';
import type { CursorBubble, CursorParserContext } from './cursor_session_parser';

const context: CursorParserContext = {
  agentId: 'cursor-install',
  spaceId: 'investigation',
  hashSalt: 'test-salt',
  fileHash: 'source-hash',
  ingestedAt: '2026-10-12T12:00:00Z',
  complete: true,
  owner: { id: 'local-owner', name: 'Analyst', provenance: 'local_os_account' },
};
const header = {
  composerId: 'session-one',
  name: 'Review service boundaries',
  createdAt: Date.parse('2026-10-12T10:00:00Z'),
};
const bubble = (id: string, result?: string): CursorBubble => ({
  bubbleId: id,
  type: 2,
  createdAt: '2026-10-12T10:05:00Z',
  toolFormerData: {
    name: 'run_terminal_command_v2',
    status: 'completed',
    toolCallId: `call-${id}`,
    params: JSON.stringify({ command: 'git status' }),
    result,
  },
});

it('keeps completed requests unknown unless recorded execution evidence supports the outcome', () => {
  const records = parseCursorSession(
    header,
    {},
    [
      bubble('unknown'),
      bubble('success', '{"exitCode":0}'),
      bubble('failure', '{"exitCode":2}'),
      bubble('error', '{"isError":true}'),
    ],
    context
  );
  expect(
    records
      .filter((record) => record.event.action === 'tool_call')
      .map((record) => record.event.outcome)
  ).toEqual(['unknown', 'success', 'failure', 'failure']);
  expect(records.at(-1)?.session).toMatchObject({
    tool_call_count: 4,
    success_count: 1,
    failure_count: 2,
    unknown_count: 1,
    completion_known: false,
  });
});

it('redacts learned secrets across prompts and tool inputs and exports no tool output', () => {
  const secret = 'private-example-token-123456';
  const records = parseCursorSession(
    header,
    {},
    [
      { bubbleId: 'prompt', type: 1, createdAt: '2026-10-12T10:01:00Z', text: `API_KEY=${secret}` },
      {
        ...bubble('tool'),
        toolFormerData: {
          name: 'run_terminal_command_v2',
          params: JSON.stringify({
            command: `curl https://example.invalid -H "Authorization: Bearer ${secret}"`,
          }),
          result: '{"output":"private tool output"}',
        },
      },
    ],
    context
  );
  expect(JSON.stringify(records)).not.toContain(secret);
  expect(JSON.stringify(records)).not.toContain('private tool output');
  expect(records[0].content?.input).toMatchObject({ kind: 'command', redacted: true });
  expect(records.at(-1)?.content?.prompts?.[0]).toMatchObject({
    id: 'prompt',
    redacted: true,
    source: 'cursor.user_bubble.text',
  });
});

it('preserves explicit parent, owner and recorded model evidence and ignores UI recency', () => {
  const records = parseCursorSession(
    {
      ...header,
      lastUpdatedAt: Date.parse('2026-10-13T10:00:00Z'),
      subagentInfo: { parentComposerId: 'parent-session' },
    },
    {},
    [{ ...bubble('one'), modelInfo: { modelName: 'recorded-model' } }],
    context
  );
  expect(records.at(-1)).toMatchObject({
    agent: { type: 'cursor' },
    owner: context.owner,
    model: 'recorded-model',
    session: { parent_id: 'parent-session', role: 'subagent', last_seen: '2026-10-12T10:05:00Z' },
    source: { kind: 'cursor_local_session' },
    kibana: { space_id: 'investigation' },
  });
  expect(records.at(-1)?.creator).toBeUndefined();
  expect(parseCursorSession(header, {}, [bubble('one')], context).at(-1)?.model).toBeUndefined();
});

it('uses stable IDs for repeat imports and preserves partial coverage', () => {
  const input = [bubble('one'), { ...bubble('missing-time'), createdAt: undefined }];
  const first = parseCursorSession(header, {}, input, context);
  const second = parseCursorSession(header, {}, input, {
    ...context,
    ingestedAt: '2026-10-13T12:00:00Z',
  });
  expect(first.map((record) => record.event.id)).toEqual(second.map((record) => record.event.id));
  expect(first.at(-1)?.session.summary_complete).toBe(false);
  expect(first.at(-1)?.session.tool_call_count).toBe(1);
});

it('bounds user prompts and never invents timestamps for undated sessions', () => {
  const records = parseCursorSession(
    header,
    {},
    Array.from({ length: 55 }, (_, index) => ({
      bubbleId: `prompt-${index}`,
      type: 1,
      createdAt: '2026-10-12T10:01:00Z',
      text: 'a'.repeat(9000),
    })),
    context
  );
  expect(records.at(-1)?.content).toMatchObject({ prompts_total: 55, prompts_truncated: true });
  expect(records.at(-1)?.content?.prompts).toHaveLength(50);
  expect(records.at(-1)?.content?.prompts?.[0].truncated).toBe(true);
  expect(
    parseCursorSession(header, {}, [{ bubbleId: 'undated', type: 1, text: 'Review' }], context)
  ).toEqual([]);
  expect(parseCursorSession({ ...header, isDraft: true }, {}, [bubble('one')], context)).toEqual(
    []
  );
});

it('retains every recorded model while preserving the last timestamped model separately', () => {
  const records = parseCursorSession(
    header,
    {},
    [
      {
        ...bubble('earlier'),
        createdAt: '2026-10-12T10:02:00Z',
        modelInfo: { modelName: 'first-model' },
      },
      { ...bubble('later'), modelInfo: { modelName: 'last-model' } },
      { bubbleId: 'undated-model', type: 2, modelInfo: { modelName: 'another-recorded-model' } },
    ],
    context
  );
  const summary = records.at(-1);
  expect(summary?.model).toBe('last-model');
  expect(summary?.session.models).toEqual(
    expect.arrayContaining(['first-model', 'last-model', 'another-recorded-model'])
  );
  expect(summary?.session.models).toHaveLength(3);
});
