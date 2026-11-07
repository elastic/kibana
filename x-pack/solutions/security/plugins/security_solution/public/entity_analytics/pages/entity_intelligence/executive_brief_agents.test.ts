/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodexSession } from './ai_agents/codex_types';
import type { AgentInventoryItem } from './ai_agents/types';
import {
  buildExecutiveBriefAgentSnapshot,
  MAX_BRIEF_AGENT_LABEL,
  MAX_BRIEF_AGENT_SESSIONS,
  MAX_BRIEF_BUILDER_AGENTS,
} from './executive_brief_agents';
import type { BriefBuilderAgentInput, BriefExternalAgentInput } from './executive_brief_agents';

const session = (day: number, overrides: Partial<CodexSession> = {}): CodexSession => ({
  id: `session-${day}`,
  agentId: 'installation',
  provider: 'codex',
  role: 'user',
  model: 'same-model',
  title: `Task ${day}`,
  start: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
  lastSeen: `2026-10-${String(day).padStart(2, '0')}T11:00:00Z`,
  toolCount: 10,
  failures: 0,
  successes: 9,
  unknowns: 1,
  completedTurns: 1,
  abortedTurns: 0,
  summaryComplete: true,
  tools: [{ name: 'shell', count: 10, failure_count: 0, success_count: 9, unknown_count: 1 }],
  source: { index: 'logs-codex.entity_intelligence-default', id: `doc-${day}` },
  fileHash: 'hash',
  ...overrides,
});
const source = (sessions: CodexSession[] = []): BriefExternalAgentInput => ({
  sessions,
  isLoading: false,
  unavailable: false,
  partial: false,
});
const agent = (id: string): AgentInventoryItem => ({
  id,
  entityId: `agent:${id}`,
  name: `Agent ${id}`,
  description: 'Never include this instruction text',
  type: 'custom',
  readonly: false,
  configuredTools: [],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: [],
  owner: { name: 'Creator' },
  activity: { invocations: 4, failedInvocations: 1 },
});
const builder = (agents: AgentInventoryItem[] = [agent('one')]): BriefBuilderAgentInput => ({
  agents,
  isLoading: false,
  status: 'available',
  definitionsStatus: 'available',
  activityStatus: 'available',
});
const history = (): CodexSession[] => Array.from({ length: 5 }, (_, index) => session(index + 1));

it('keeps sessions, accumulated observations and Builder invocations in separate units', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source([session(1)]),
    cursor: source([session(1, { provider: 'cursor' })]),
    builder: builder(),
  });
  expect(result.lookbackDays).toBe(30);
  expect(result.totals).toEqual({
    agentIdentities: 3,
    externalSessions: 2,
    toolObservations: 20,
    failedToolObservations: 0,
    unknownToolOutcomes: 2,
    evaluatedSessions: 0,
    changedSessions: 0,
    builderInvocations: 4,
  });
  expect(result.providers[2]).toMatchObject({
    identityCount: 1,
    invocations: 4,
    failedInvocations: 1,
  });
  expect(result.limitations).toEqual(
    expect.arrayContaining([
      'unknown_outcomes',
      'limited_baseline',
      'cumulative_observations',
      'agent_builder_baseline',
    ])
  );
});

it.each(['unavailable', 'isLoading'] as const)(
  'withholds stale source facts and aggregate totals when %s',
  (flag) => {
    const result = buildExecutiveBriefAgentSnapshot({
      codex: { ...source([...history(), session(10)]), [flag]: true },
      cursor: source([session(1, { provider: 'cursor' })]),
      builder: builder(),
    });
    expect(result.providers[0].sessions).toBeUndefined();
    expect(result.totals.externalSessions).toBeUndefined();
    expect(result.totals.agentIdentities).toBeUndefined();
    expect(result.totals.builderInvocations).toBe(4);
    expect(result.changedSessions).toEqual([]);
  }
);

it('retains observed per-source counts for partial queries, but withholds whole-source totals', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: { ...source([session(1)]), partial: true },
    cursor: source(),
    builder: builder(),
  });
  expect(result.providers[0]).toMatchObject({
    status: 'partial',
    sessions: 1,
    toolObservations: 10,
  });
  expect(result.totals.toolObservations).toBeUndefined();
  expect(result.limitations).toContain('source_partial');
});

it('keeps observed counts for incomplete and mixed-model sessions while limiting behavior conclusions', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source([
      ...history(),
      session(10, { summaryComplete: false }),
      session(11, { models: ['first', 'second'] }),
    ]),
    cursor: source(),
    builder: builder(),
  });
  expect(result.providers[0]).toMatchObject({
    status: 'available',
    partialSessions: 1,
    mixedModelSessions: 1,
    sessions: 7,
  });
  expect(result.totals.externalSessions).toBe(7);
  expect(result.totals.evaluatedSessions).toBe(0);
  expect(result.changedSessions).toEqual([]);
  expect(result.limitations).toEqual(
    expect.arrayContaining(['incomplete_sessions', 'mixed_models'])
  );
});

it('retains exact evidence and route keys without leaking prompt or creator content', () => {
  const changed = session(10, {
    title: 'Review project permissions',
    tools: [{ name: 'new_tool', count: 10, failure_count: 0, success_count: 9, unknown_count: 1 }],
    prompts: [
      {
        id: 'prompt-1',
        timestamp: '2026-10-10T10:00:00Z',
        text: 'PRIVATE PROMPT',
        redacted: false,
        truncated: false,
        source: 'request',
      },
    ],
    owner: { id: '501', name: 'Private owner', provenance: 'local_os_account' },
    creator: { id: 'Private creator', provenance: 'codex_session_creator' },
  });
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source([...history(), changed]),
    cursor: source(),
    builder: builder(),
  });
  expect(result.changedSessions[0]).toMatchObject({
    agentId: 'installation',
    sessionId: 'session-10',
    routeKey: '["installation","session-10"]',
    title: 'Review project permissions',
    source: { index: changed.source.index, id: 'doc-10' },
    findings: [
      expect.objectContaining({ kind: 'new_tool', toolName: 'new_tool', baselineSampleSize: 5 }),
    ],
  });
  expect(result.providers[0].localOwnerSessions).toBe(1);
  expect(result.builderAgents[0].creatorRecorded).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(
    /PRIVATE PROMPT|Private owner|Private creator|Never include this instruction/
  );
  expect(result.limitations).toContain('local_owner_not_caller');
});

it('bounds changed sessions, agent names, findings and definitions without reducing factual totals', () => {
  const changes = Array.from({ length: 10 }, (_, index) =>
    session(index + 10, {
      agentId: `installation-${index}`,
      title: 'a'.repeat(1000),
      tools: [
        { name: 'new-tool', count: 10, failure_count: 0, success_count: 9, unknown_count: 1 },
      ],
    })
  );
  const sessions = changes.flatMap((changed) => [
    ...history().map((prior) => ({ ...prior, agentId: changed.agentId })),
    changed,
  ]);
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source(sessions),
    cursor: source(),
    builder: builder(
      Array.from({ length: 8 }, (_, index) => ({ ...agent(String(index)), name: 'b'.repeat(1000) }))
    ),
  });
  expect(result.totals.changedSessions).toBe(10);
  expect(result.changedSessions).toHaveLength(MAX_BRIEF_AGENT_SESSIONS);
  expect(result.changedSessions[0].title).toHaveLength(MAX_BRIEF_AGENT_LABEL);
  expect(result.builderAgents).toHaveLength(MAX_BRIEF_BUILDER_AGENTS);
  expect(result.builderAgents[0].name).toHaveLength(MAX_BRIEF_AGENT_LABEL);
  expect(result.providers[2].identityCount).toBe(8);
});

it('deduplicates the newest snapshot and excludes another provider from source totals', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source([
      session(1),
      session(1, { ingestedAt: '2026-10-12T12:00:00Z', toolCount: 20 }),
      session(2, { provider: 'cursor' }),
    ]),
    cursor: source(),
    builder: builder(),
  });
  expect(result.totals.externalSessions).toBe(1);
  expect(result.totals.toolObservations).toBe(20);
});

it('retains known Builder definitions when trace metrics fail without presenting zero invocations', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source(),
    cursor: source(),
    builder: { ...builder(), status: 'partial', activityStatus: 'unavailable' },
  });
  expect(result.providers[2]).toMatchObject({
    status: 'partial',
    identityCount: 1,
    definitionsStatus: 'available',
    activityStatus: 'unavailable',
  });
  expect(result.providers[2].invocations).toBeUndefined();
  expect(result.totals.builderInvocations).toBeUndefined();
  expect(result.builderAgents[0].invocations).toBeUndefined();
  expect(result.totals.agentIdentities).toBe(1);
});

it('drops stale Builder definitions and invocations after a definitions failure', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source(),
    cursor: source(),
    builder: { ...builder(), status: 'unavailable', definitionsStatus: 'unavailable' },
  });
  expect(result.providers[2].identityCount).toBeUndefined();
  expect(result.builderAgents).toEqual([]);
  expect(result.totals.agentIdentities).toBeUndefined();
  expect(result.totals.builderInvocations).toBeUndefined();
});

it('includes cloud runs without labelling their requester as a local OS owner', () => {
  const result = buildExecutiveBriefAgentSnapshot({
    codex: source(),
    cursor: source(),
    googleAdk: source([session(14, { provider: 'google_adk', agentId: 'cloud-agent' })]),
    builder: builder([]),
  });
  expect(result.providers.find((item) => item.provider === 'google_adk')).toMatchObject({
    name: 'Google ADK',
    identityCount: 1,
    sessions: 1,
    toolObservations: 10,
  });
  expect(result.totals.externalSessions).toBe(1);
  expect(result.limitations).not.toContain('local_owner_not_caller');
});
