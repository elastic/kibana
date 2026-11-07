/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { summarizeOverviewSessions } from './overview_operations_model';
import type { CodexSession } from './ai_agents/codex_types';

const session = (day: number, overrides: Partial<CodexSession> = {}): CodexSession => ({
  id: `session-${day}`,
  agentId: 'installation',
  provider: 'codex',
  role: 'user',
  model: 'same-model',
  start: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
  lastSeen: `2026-10-${String(day).padStart(2, '0')}T11:00:00Z`,
  toolCount: 10,
  failures: 0,
  successes: 10,
  unknowns: 0,
  completedTurns: 1,
  abortedTurns: 0,
  summaryComplete: true,
  tools: [{ name: 'shell', count: 10, failure_count: 0, success_count: 10, unknown_count: 0 }],
  source: { index: 'logs-codex.entity_intelligence-default', id: `doc-${day}` },
  fileHash: 'hash',
  ...overrides,
});
const history = () => Array.from({ length: 5 }, (_, index) => session(index + 1));

it('surfaces only measured drift and distinguishes too little history from an evaluated comparison', () => {
  expect(summarizeOverviewSessions(history()).evaluatedSessions).toBe(0);
  const changed = session(10, {
    tools: [{ name: 'new_tool', count: 10, failure_count: 0, success_count: 10, unknown_count: 0 }],
  });
  const result = summarizeOverviewSessions([...history(), changed]);
  expect(result).toMatchObject({
    installations: 1,
    sessions: 6,
    observations: 60,
    evaluatedSessions: 1,
    changedSessions: 1,
  });
  expect(result.signals[0].session.id).toBe(changed.id);
  expect(result.signals[0].findings[0]).toMatchObject({ kind: 'new_tool', toolName: 'new_tool' });
});

it('retains review activity counts but excludes reviews from recent user sessions and the attention queue', () => {
  const review = session(12, {
    role: 'guardian_review',
    tools: [{ name: 'new_tool', count: 10, failure_count: 0, success_count: 10, unknown_count: 0 }],
  });
  const result = summarizeOverviewSessions([...history(), review]);
  expect(result.sessions).toBe(6);
  expect(result.recentSessions.some((item) => item.id === review.id)).toBe(false);
  expect(result.signals).toEqual([]);
});

it('deduplicates the newest snapshot and isolates providers and installations', () => {
  const original = session(1);
  const refreshed = {
    ...original,
    ingestedAt: '2026-10-12T10:00:00Z',
    toolCount: 20,
    successes: 20,
    tools: [{ name: 'shell', count: 20, failure_count: 0, success_count: 20, unknown_count: 0 }],
  };
  const cursor = session(1, { provider: 'cursor' });
  const otherInstall = session(1, { agentId: 'another-installation' });
  const result = summarizeOverviewSessions([refreshed, original, cursor, otherInstall]);
  expect(result).toMatchObject({
    installations: 3,
    sessions: 3,
    observations: 40,
    evaluatedSessions: 0,
  });
});

it('withholds drift if the selected snapshot is incomplete', () => {
  const changed = session(10, {
    summaryComplete: false,
    tools: [{ name: 'new_tool', count: 10, failure_count: 0, success_count: 10, unknown_count: 0 }],
  });
  expect(summarizeOverviewSessions([...history(), changed])).toMatchObject({
    evaluatedSessions: 0,
    changedSessions: 0,
    signals: [],
  });
});
