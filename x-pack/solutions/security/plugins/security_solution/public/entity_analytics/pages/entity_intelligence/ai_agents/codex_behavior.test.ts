/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeCodexSession } from './codex_behavior';
import type { CodexSession, CodexToolEvent } from './codex_types';

const session = (day: number, overrides: Partial<CodexSession> = {}): CodexSession => ({
  id: `session-${day}`,
  agentId: 'codex:install-one',
  model: 'gpt-6',
  start: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
  lastSeen: `2026-10-${String(day).padStart(2, '0')}T13:00:00Z`,
  toolCount: 10,
  failures: 0,
  successes: 10,
  unknowns: 0,
  completedTurns: 2,
  abortedTurns: 0,
  tools: [
    { name: 'exec_command', count: 10, success_count: 10, failure_count: 0, unknown_count: 0 },
  ],
  summaryComplete: true,
  source: { index: 'logs-codex.entity_intelligence-default', id: `summary-${day}` },
  fileHash: 'hash',
  ...overrides,
});
const previous = Array.from({ length: 5 }, (_, index) => session(index + 1));
const tool = (index: number, overrides: Partial<CodexToolEvent> = {}): CodexToolEvent => ({
  id: `call-${index}`,
  sessionId: 'session-12',
  agentId: 'codex:install-one',
  timestamp: `2026-10-12T12:00:0${index}Z`,
  toolName: 'exec_command',
  outcome: 'failure',
  source: { index: 'logs-codex.entity_intelligence-default', id: `call-${index}` },
  ...overrides,
});

it('finds metadata drift from observed imported summaries without loading or synthesizing prior tool rows', () => {
  const current = session(12, {
    toolCount: 45,
    successes: 42,
    failures: 3,
    tools: [
      { name: 'exec_command', count: 40, success_count: 37, failure_count: 3, unknown_count: 0 },
      { name: 'apply_patch', count: 5, success_count: 5, failure_count: 0, unknown_count: 0 },
    ],
  });
  const analysis = analyzeCodexSession(current, previous, [], false);
  expect(analysis.status).toBe('evaluated');
  expect(analysis.unitKind).toBe('session');
  expect(analysis.baseline.unitCount).toBe(5);
  expect(analysis.baseline.detailedToolCallCount).toBe(0);
  expect(analysis.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'new_tool', toolName: 'apply_patch' }),
      expect.objectContaining({ kind: 'tool_volume_increase', observed: 45 }),
    ])
  );
  expect(analysis.comparisons.duration_increase.status).toBe('unavailable_metadata');
  expect(analysis.current.observedDurationCount).toBe(0);
});

it('suppresses comparison findings for incomplete imported summaries', () => {
  const incompletePrior = previous.map((item, index) =>
    index ? item : { ...item, summaryComplete: false }
  );
  const analysis = analyzeCodexSession(session(12), incompletePrior, [], false);
  expect(analysis.status).toBe('partial');
  expect(analysis.comparisons.new_tool.status).toBe('incomplete_coverage');
  expect(analysis.findings).toEqual([]);
  expect(
    analyzeCodexSession(session(12, { summaryComplete: false }), previous, [], false).status
  ).toBe('partial');
});

it('bounds its own baseline and excludes another installation or overlapping observation', () => {
  const candidates = Array.from({ length: 11 }, (_, index) => session(index + 1));
  const analysis = analyzeCodexSession(
    session(12),
    [
      ...candidates,
      candidates[0],
      session(1, { agentId: 'codex:other', summaryComplete: false }),
      session(1, { id: 'overlap', lastSeen: '2026-10-12T12:00:00Z', summaryComplete: false }),
    ],
    [],
    false
  );
  expect(analysis.baseline.unitCount).toBe(10);
  expect(analysis.baseline.start).toBe('2026-10-02T12:00:00.000Z');
  expect(analysis.status).toBe('evaluated');
});

it('attributes only the selected session call evidence and never substitutes an unknown outcome', () => {
  const current = session(12, {
    toolCount: 4,
    successes: 0,
    failures: 3,
    unknowns: 1,
    tools: [
      { name: 'exec_command', count: 4, success_count: 0, failure_count: 3, unknown_count: 1 },
    ],
  });
  const analysis = analyzeCodexSession(
    current,
    previous,
    [
      tool(0),
      tool(1),
      tool(2),
      tool(3, { outcome: 'unknown' }),
      tool(4, { sessionId: 'other-session', toolName: 'unrelated' }),
      tool(5, { agentId: 'codex:other', toolName: 'unrelated' }),
    ],
    true
  );
  expect(analysis.current.detailedToolCallCount).toBe(4);
  expect(analysis.current.unknownOutcomeCount).toBe(1);
  const burst = analysis.findings.find((finding) => finding.kind === 'repeated_tool_failures');
  expect(burst?.observed).toBe(3);
  expect(burst?.evidence.map((item) => item.callId)).toEqual(['call-0', 'call-1', 'call-2']);
  expect(burst?.sampleBased).toBe(false);
});

it('retains complete snapshot comparisons with capped detail while labelling repeated-failure evidence sampled', () => {
  const current = session(12, {
    toolCount: 100,
    successes: 95,
    failures: 5,
    tools: [
      { name: 'exec_command', count: 100, success_count: 95, failure_count: 5, unknown_count: 0 },
    ],
  });
  const analysis = analyzeCodexSession(current, previous, [tool(0), tool(1), tool(2)], false);
  expect(analysis.status).toBe('evaluated');
  expect(analysis.comparisons.repeated_tool_failures.status).toBe('incomplete_coverage');
  expect(
    analysis.findings.find((finding) => finding.kind === 'repeated_tool_failures')?.sampleBased
  ).toBe(true);
  expect(
    analysis.findings.find((finding) => finding.kind === 'tool_volume_increase')?.observed
  ).toBe(100);
});

it('withholds historical drift when current or candidate snapshots mix recorded models', () => {
  const changed = session(12, {
    models: ['earlier-model', 'gpt-6'],
    toolCount: 100,
    successes: 100,
    tools: [
      { name: 'new_tool', count: 100, success_count: 100, failure_count: 0, unknown_count: 0 },
    ],
  });
  const currentMixed = analyzeCodexSession(changed, previous, [], false);
  expect(currentMixed.baseline.unitCount).toBe(0);
  expect(currentMixed.comparisons.new_tool.status).not.toBe('evaluated');
  expect(currentMixed.findings).toEqual([]);
  const priorMixed = analyzeCodexSession(
    { ...changed, models: ['gpt-6'] },
    previous.map((item) => ({ ...item, models: ['earlier-model', 'gpt-6'] })),
    [],
    false
  );
  expect(priorMixed.baseline.unitCount).toBe(0);
  expect(priorMixed.findings).toEqual([]);
});
