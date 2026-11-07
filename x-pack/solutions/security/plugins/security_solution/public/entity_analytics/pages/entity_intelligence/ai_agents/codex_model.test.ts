/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  codexSearchIncomplete,
  getCodexSessionTitle,
  codexTotal,
  parseCodexSessions,
  parseCodexTools,
  selectCodexBaseline,
} from './codex_model';
import {
  buildCodexSessionsQuery,
  buildCodexContentQuery,
  buildCodexToolsQuery,
  CODEX_BASELINE_LIMIT,
  CODEX_SOURCE_FIELDS,
  CODEX_TOOL_LIMIT,
} from './codex_queries';
import type { CodexDocument, CodexSearchResponse, CodexSession } from './codex_types';

const doc: CodexDocument = {
  '@timestamp': '2026-10-12T12:00:00Z',
  event: { id: 'event', action: 'session', outcome: 'unknown' },
  agent: { id: 'codex:install-one', name: 'Codex', type: 'codex' },
  session: {
    id: 'session-one',
    start: '2026-10-12T12:00:00Z',
    last_seen: '2026-10-12T13:00:00Z',
    summary_complete: true,
    tool_call_count: 5,
    failure_count: 1,
    success_count: 3,
    unknown_count: 1,
    tools: [
      { name: 'exec_command', count: 5, failure_count: 1, success_count: 3, unknown_count: 1 },
    ],
  },
  model: 'gpt-6',
  source: { kind: 'codex_local_session', file_hash: 'file-hash', schema_version: 1 },
  kibana: { space_id: 'marketing' },
};
const response = (docs: CodexDocument[]): CodexSearchResponse => ({
  hits: {
    hits: docs.map((item, index) => ({
      _index: 'logs-codex.entity_intelligence-marketing',
      _id: `doc-${index}`,
      _source: item,
    })),
    total: { value: docs.length, relation: 'eq' },
  },
});
const session = parseCodexSessions(response([doc]), 'marketing')[0];

it('queries an exact space, installation, and session using bounded metadata-only source leaves', () => {
  const sessions = buildCodexSessionsQuery('marketing').params;
  expect(sessions.index).toBe('logs-codex.entity_intelligence-marketing');
  expect(sessions.query?.bool?.filter).toEqual(
    expect.arrayContaining([
      { term: { 'kibana.space_id': 'marketing' } },
      { term: { 'event.action': 'session' } },
    ])
  );
  const tools = buildCodexToolsQuery('marketing', 'codex:install-one', 'session-one').params;
  expect(tools.index).toBe(sessions.index);
  expect(tools.size).toBe(CODEX_TOOL_LIMIT);
  expect(tools.query?.bool?.filter).toEqual(
    expect.arrayContaining([
      { term: { 'kibana.space_id': 'marketing' } },
      { term: { 'agent.id': 'codex:install-one' } },
      { term: { 'session.id': 'session-one' } },
      { term: { 'event.action': 'tool_call' } },
    ])
  );
  expect(CODEX_SOURCE_FIELDS).not.toContain('session.tools');
  expect(CODEX_SOURCE_FIELDS.some((field) => /\*|arguments|result|cwd|file_path/.test(field))).toBe(
    false
  );
  expect(CODEX_SOURCE_FIELDS).toEqual(
    expect.arrayContaining([
      'session.tools.name',
      'session.tools.failure_count',
      'source.record_hash',
    ])
  );
});

it('rejects records from another space or source and sanitizes nested tool summaries', () => {
  const extraTool = {
    name: 'exec_command',
    count: 5,
    failure_count: 1,
    success_count: 3,
    unknown_count: 1,
    arguments: { command: 'private-command' },
  };
  const parsed = parseCodexSessions(
    response([
      { ...doc, session: { ...doc.session, tools: [extraTool] } },
      { ...doc, kibana: { space_id: 'other-space' } },
      { ...doc, source: { ...doc.source, kind: 'unrecognized' } },
    ]),
    'marketing'
  );
  expect(parsed).toHaveLength(1);
  expect(parsed[0].tools[0]).toEqual({
    name: 'exec_command',
    count: 5,
    failure_count: 1,
    success_count: 3,
    unknown_count: 1,
  });
  expect(JSON.stringify(parsed)).not.toContain('private-command');
  expect(parsed[0].source).toEqual({
    index: 'logs-codex.entity_intelligence-marketing',
    id: 'doc-0',
  });
});

it('marks contradictory per-tool outcomes incomplete even when total call counts agree', () => {
  const parsed = parseCodexSessions(
    response([
      {
        ...doc,
        session: {
          ...doc.session,
          failure_count: 0,
          success_count: 4,
        },
      },
    ]),
    'marketing'
  );
  expect(parsed[0].summaryComplete).toBe(false);
  expect(
    parseCodexSessions(
      response([
        {
          ...doc,
          session: {
            ...doc.session,
            summary_complete: false,
          },
        },
      ]),
      'marketing'
    )[0].summaryComplete
  ).toBe(false);
  expect(
    parseCodexSessions(
      response([
        {
          ...doc,
          session: {
            ...doc.session,
            tool_call_count: -1,
          },
        },
      ]),
      'marketing'
    )
  ).toEqual([]);
});

it('keeps unknown outcomes and only finite, observed nonnegative tool durations', () => {
  const tool: CodexDocument = {
    ...doc,
    event: { id: 'call-event', action: 'tool_call', outcome: 'unknown' },
    tool: { name: 'exec_command', call: { id: 'call-one' } },
    duration_ms: -1,
  };
  const parsed = parseCodexTools(
    response([
      tool,
      { ...tool, kibana: { space_id: 'other-space' } },
      { ...tool, agent: { ...tool.agent, id: 'other-installation' } },
      { ...tool, session: { ...tool.session, id: 'other-session' } },
      { ...tool, '@timestamp': 'invalid' },
    ]),
    'marketing',
    'codex:install-one',
    'session-one'
  );
  expect(parsed).toHaveLength(1);
  expect(parsed[0]).toMatchObject({ id: 'call-one', outcome: 'unknown', durationMs: undefined });
  expect(
    parseCodexTools(
      response([{ ...tool, duration_ms: 0 }]),
      'marketing',
      'codex:install-one',
      'session-one'
    )[0].durationMs
  ).toBe(0);
});

it('selects at most ten preceding distinct observations from the same installation without mutating inventory', () => {
  const selected = { ...session, start: '2026-10-25T12:00:00Z' };
  const prior: CodexSession[] = Array.from({ length: 12 }, (_, index) => ({
    ...session,
    id: `prior-${index + 1}`,
    start: `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
    lastSeen: `2026-10-${String(index + 1).padStart(2, '0')}T13:00:00Z`,
  }));
  const candidates = [
    ...prior,
    prior[11],
    { ...prior[0], id: 'other-agent', agentId: 'codex:install-two' },
    { ...prior[0], id: 'overlap', lastSeen: selected.start },
    { ...prior[0], id: 'ongoing', lastSeen: '2026-10-26T12:00:00Z' },
    selected,
  ];
  const originalIds = candidates.map((item) => item.id);
  const selectedPrior = selectCodexBaseline(candidates, selected);
  expect(selectedPrior).toHaveLength(CODEX_BASELINE_LIMIT);
  expect(selectedPrior.map((item) => item.id)).toEqual(
    Array.from({ length: 10 }, (_, index) => `prior-${12 - index}`)
  );
  expect(candidates.map((item) => item.id)).toEqual(originalIds);
});

it('distinguishes complete empty results from capped, timed-out, and shard-partial responses', () => {
  expect(codexSearchIncomplete(response([]))).toBe(false);
  expect(codexTotal(response([doc]))).toBe(1);
  expect(codexSearchIncomplete({ ...response([doc]), timed_out: true })).toBe(true);
  expect(codexSearchIncomplete({ ...response([doc]), _shards: { total: 2, failed: 1 } })).toBe(
    true
  );
  expect(codexSearchIncomplete({ hits: { hits: [], total: { value: 1, relation: 'eq' } } })).toBe(
    true
  );
  expect(codexSearchIncomplete({ hits: { hits: [], total: { value: 0, relation: 'gte' } } })).toBe(
    true
  );
});

it('requires a recorded matching model and matching legacy parent/child role while retaining zero-tool observations', () => {
  const selected = { ...session, start: '2026-10-25T12:00:00Z' };
  const matching = { ...session, id: 'matching' };
  const zeroTools = { ...session, id: 'zero-tools', toolCount: 0, tools: [] };
  const candidates = [
    matching,
    zeroTools,
    { ...session, id: 'other-model', model: 'gpt-5-luna' },
    { ...session, id: 'missing-model', model: undefined },
    { ...session, id: 'child', parentId: 'parent-session' },
  ];
  expect(selectCodexBaseline(candidates, selected).map((item) => item.id)).toEqual([
    'matching',
    'zero-tools',
  ]);
  expect(selectCodexBaseline(candidates, { ...selected, model: undefined })).toEqual([]);
  expect(
    selectCodexBaseline(candidates, { ...selected, parentId: 'different-parent' }).map(
      (item) => item.id
    )
  ).toEqual(['child']);
});

it('preserves declared model-call and native-completion provenance without joining their observations', () => {
  const parsedSession = parseCodexSessions(
    response([
      {
        ...doc,
        session: {
          ...doc.session,
          model_tool_call_count: 3,
          native_tool_completion_count: 2,
        },
      },
    ]),
    'marketing'
  )[0];
  expect(parsedSession).toMatchObject({
    toolCount: 5,
    modelToolCallCount: 3,
    nativeToolCompletionCount: 2,
  });
  const calls: CodexDocument[] = ['model', 'native'].map((kind) => ({
    ...doc,
    event: { id: kind, action: 'tool_call', outcome: 'unknown' },
    tool: { name: 'exec_command', call: { id: kind } },
    source: {
      ...doc.source,
      observation_type: kind === 'model' ? 'model_tool_call' : 'native_tool_completion',
    },
  }));
  const events = parseCodexTools(response(calls), 'marketing', doc.agent.id, doc.session.id);
  expect(events.map((event) => event.observationType)).toEqual([
    'model_tool_call',
    'native_tool_completion',
  ]);
  expect(events).toHaveLength(2);
});

it('keeps observed process exit and turn metadata without inferring an outcome from missing evidence', () => {
  const events = parseCodexTools(
    response([
      {
        ...doc,
        event: { id: 'tool-event', action: 'tool_call', outcome: 'unknown' },
        tool: { name: 'exec_command', call: { id: 'call-with-process' } },
        process: { exit_code: 17 },
        turn: { id: 'turn-one' },
      },
    ]),
    'marketing',
    doc.agent.id,
    doc.session.id
  );
  expect(events[0]).toMatchObject({ exitCode: 17, turnId: 'turn-one', outcome: 'unknown' });
  expect(CODEX_SOURCE_FIELDS).toEqual(expect.arrayContaining(['process.exit_code', 'turn.id']));
});

it('projects local ownership and recorded session creator as separate identities with sourced labels', () => {
  const owner = {
    id: 'local-os:opaque-installation-owner',
    name: 'james',
    provenance: 'local_os_account' as const,
    token: 'PRIVATE-TOKEN',
  };
  const creator = {
    id: 'user-ExactOpaqueId',
    account_id: 'account-ExactOpaqueId',
    provenance: 'codex_session_creator' as const,
    display_name: 'PRIVATE-INFERRED-NAME',
  };
  const parsed = parseCodexSessions(
    response([
      {
        ...doc,
        owner,
        creator,
        session: {
          ...doc.session,
          nickname: 'Hilbert',
          role: 'subagent',
          agent_path: '/root/identity_readiness',
        },
      },
      doc,
    ]),
    'marketing'
  );
  expect(parsed[0]).toMatchObject({
    owner: {
      id: owner.id,
      name: 'james',
      provenance: 'local_os_account',
    },
    creator: {
      id: 'user-ExactOpaqueId',
      accountId: 'account-ExactOpaqueId',
      provenance: 'codex_session_creator',
    },
    nickname: 'Hilbert',
    role: 'subagent',
    agentPath: '/root/identity_readiness',
  });
  expect(parsed[0]).not.toHaveProperty('actor');
  expect(parsed[1].owner).toBeUndefined();
  expect(parsed[1].creator).toBeUndefined();
  expect(JSON.stringify(parsed)).not.toContain('PRIVATE');
  expect(CODEX_SOURCE_FIELDS).toEqual(
    expect.arrayContaining([
      'owner.id',
      'owner.name',
      'owner.provenance',
      'creator.id',
      'creator.account_id',
      'creator.provenance',
      'session.nickname',
      'session.role',
      'session.agent_path',
    ])
  );
  expect(CODEX_SOURCE_FIELDS).not.toEqual(expect.arrayContaining(['owner', 'creator']));
});

it('omits malformed identity metadata without manufacturing a requester', () => {
  const parsed = parseCodexSessions(
    response([
      {
        ...doc,
        owner: { id: 'local-owner', name: '/private/path', provenance: 'local_os_account' },
        creator: { id: 'private\ncontent', provenance: 'codex_session_creator' },
        session: {
          ...doc.session,
          nickname: 'private\ncontent',
          agent_path: '/Users/james/private-path',
        },
      },
    ]),
    'marketing'
  );
  expect(parsed[0].owner).toBeUndefined();
  expect(parsed[0].creator).toBeUndefined();
  expect(parsed[0].nickname).toBeUndefined();
  expect(parsed[0].agentPath).toBeUndefined();
  expect(parsed[0]).not.toHaveProperty('actor');
});

it('separates recorded subagent and automatic-review roles even when model and parents match', () => {
  const selected: CodexSession = {
    ...session,
    start: '2026-10-25T12:00:00Z',
    parentId: 'parent-session',
    role: 'subagent',
  };
  const candidates: CodexSession[] = [
    { ...session, id: 'subagent', parentId: 'parent-session', role: 'subagent' },
    { ...session, id: 'review', parentId: 'parent-session', role: 'guardian_review' },
    { ...session, id: 'user', role: 'user' },
    { ...session, id: 'legacy-child', parentId: 'parent-session' },
  ];
  expect(selectCodexBaseline(candidates, selected).map((item) => item.id)).toEqual(['subagent']);
  expect(
    selectCodexBaseline(candidates, { ...selected, role: 'guardian_review' }).map((item) => item.id)
  ).toEqual(['review']);
});

it('never mixes recorded and missing roles, retaining the legacy parent comparison only for missing-role pairs', () => {
  const selected: CodexSession = { ...session, start: '2026-10-25T12:00:00Z' };
  const candidates: CodexSession[] = [
    { ...session, id: 'legacy-root' },
    { ...session, id: 'legacy-child', parentId: 'parent-session' },
    { ...session, id: 'recorded-user', role: 'user' },
    { ...session, id: 'recorded-subagent', parentId: 'parent-session', role: 'subagent' },
  ];
  expect(selectCodexBaseline(candidates, selected).map((item) => item.id)).toEqual(['legacy-root']);
  expect(
    selectCodexBaseline(candidates, { ...selected, parentId: 'parent-session' }).map(
      (item) => item.id
    )
  ).toEqual(['legacy-child']);
  expect(
    selectCodexBaseline(candidates, { ...selected, role: 'user' }).map((item) => item.id)
  ).toEqual(['recorded-user']);
});

it('keeps inventory/activity text lean and fetches content by exact document identity', () => {
  expect(CODEX_SOURCE_FIELDS).not.toContain('content.prompts.text');
  expect(CODEX_SOURCE_FIELDS).not.toContain('content.input.text');
  expect(CODEX_SOURCE_FIELDS).toContain('content.title.text');
  const query = buildCodexContentQuery(
    'marketing',
    'install',
    'session',
    'document',
    'tool_call',
    'cursor'
  ).params;
  expect(query.index).toBe('logs-cursor.entity_intelligence-marketing');
  expect(query.size).toBe(1);
  expect(query.query?.bool?.filter).toEqual(
    expect.arrayContaining([
      { term: { 'kibana.space_id': 'marketing' } },
      { term: { 'agent.id': 'install' } },
      { term: { 'session.id': 'session' } },
      { term: { 'event.action': 'tool_call' } },
      { ids: { values: ['document'] } },
    ])
  );
  expect(query._source).toContain('content.input.text');
});

it('projects bounded source-labeled titles and prompts while defending against credential text', () => {
  const record = {
    ...doc,
    content: {
      mode: 'redacted_local' as const,
      redaction_version: 1,
      title: {
        text: 'Fix ExampleSecret!',
        source: 'codex_state.threads.title',
        redacted: false,
        truncated: false,
      },
      prompts: [
        {
          id: 'prompt-one',
          timestamp: doc['@timestamp'],
          text: 'You can use demo-user/ExampleSecret! as credentials if you need',
          source: 'item_completed.UserMessage',
          redacted: false,
          truncated: false,
        },
      ],
      prompts_total: 1,
      prompts_truncated: false,
    },
  };
  const parsed = parseCodexSessions(response([record]), 'marketing')[0];
  expect(getCodexSessionTitle(parsed)).toBe('Fix [REDACTED]');
  expect(parsed.prompts).toHaveLength(1);
  expect(parsed.prompts?.[0].redacted).toBe(true);
  expect(JSON.stringify(parsed)).not.toContain('ExampleSecret!');
  expect(getCodexSessionTitle({ ...session, nickname: 'Agent name' })).toBe('Agent name');
  expect(
    parseCodexSessions(
      response([{ ...record, content: { ...record.content, redaction_version: 99 } }]),
      'marketing'
    )[0].prompts
  ).toBeUndefined();
});

it('learns secrets from the displayed recent prompt window before projecting its earlier entries', () => {
  const prompts = Array.from({ length: 51 }, (_, index) => ({
    id: `prompt-${index}`,
    timestamp: doc['@timestamp'],
    source: 'item_completed.UserMessage',
    redacted: false,
    truncated: false,
    text: index === 50 ? 'password: ExampleSecret!' : 'Use ExampleSecret!',
  }));
  const parsed = parseCodexSessions(
    response([
      {
        ...doc,
        content: { mode: 'redacted_local', redaction_version: 1, prompts, prompts_total: 51 },
      },
    ]),
    'marketing'
  )[0];
  expect(parsed.prompts).toHaveLength(50);
  expect(parsed.prompts?.[0].id).toBe('prompt-1');
  expect(parsed.promptsTruncated).toBe(true);
  expect(JSON.stringify(parsed.prompts)).not.toContain('ExampleSecret!');
});

it('preserves recorded models and excludes mixed-model sessions from matched baselines', () => {
  const mixed = parseCodexSessions(
    response([{ ...doc, session: { ...doc.session, models: ['first-model', 'gpt-6', 'gpt-6'] } }]),
    'marketing'
  )[0];
  expect(CODEX_SOURCE_FIELDS).toContain('session.models');
  expect(mixed.model).toBe('gpt-6');
  expect(mixed.models).toEqual(['first-model', 'gpt-6']);
  const prior = {
    ...session,
    id: 'prior',
    start: '2026-10-11T10:00:00Z',
    lastSeen: '2026-10-11T11:00:00Z',
  };
  expect(selectCodexBaseline([prior], mixed)).toEqual([]);
  expect(
    selectCodexBaseline([{ ...prior, models: ['first-model', 'gpt-6'] }, prior], session)
  ).toEqual([prior]);
  expect(selectCodexBaseline([{ ...prior, models: ['contradictory-model'] }], session)).toEqual([]);
});
