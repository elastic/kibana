/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSecuritySequences } from './security_sequences';
import type { SecurityFinding } from './types';

const event = (id: string, changes: Partial<SecurityFinding> = {}): SecurityFinding => ({
  id,
  timestamp: '2026-10-13T12:00:00Z',
  title: 'Protected file access blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  actor: { id: 'person-1', name: 'James' },
  host: { id: 'host-1', name: 'workstation' },
  agent: { id: 'install-1', provider: 'codex', sessionId: 'session-1' },
  source: { index: 'alerts', id },
  rule: { name: 'Protected access' },
  entityIds: ['user:person-1', 'host:host-1'],
  ancestors: [],
  ...changes,
});
const scenario = { id: 'scenario-1', kind: 'controlled' as const, step: 2 };

it('orders actual observations and preserves missing scenario steps', () => {
  const findings = [
    event('later', { scenario: { ...scenario, step: 4 }, timestamp: '2026-10-13T12:04:00Z' }),
    event('earlier', { scenario }),
    event('middle', { scenario: { ...scenario, step: 3 }, timestamp: '2026-10-13T12:02:00Z' }),
  ];
  const [sequence] = buildSecuritySequences(findings);
  expect(sequence.basis).toBe('scenario');
  expect(sequence.findings.map((finding) => finding.scenario?.step)).toEqual([2, 3, 4]);
  expect(findings.map((finding) => finding.id)).toEqual(['later', 'earlier', 'middle']);
});

it('uses observed time before scenario step if source clocks and numbering disagree', () => {
  const [sequence] = buildSecuritySequences([
    event('step-two', { scenario, timestamp: '2026-10-13T12:10:00Z' }),
    event('step-four', { scenario: { ...scenario, step: 4 } }),
  ]);
  expect(sequence.findings.map((finding) => finding.id)).toEqual(['step-four', 'step-two']);
});

it.each<Partial<SecurityFinding>>([
  { agent: { id: 'install-2', provider: 'codex', sessionId: 'session-1' } },
  { agent: { id: 'install-1', provider: 'cursor', sessionId: 'session-1' } },
  { agent: { id: 'install-1', provider: 'codex', sessionId: 'session-2' } },
  { actor: { id: 'person-2', name: 'James' } },
  { host: { id: 'host-2', name: 'workstation' } },
  { entityIds: ['user:person-2', 'host:host-1'] },
  { traceId: 'different-trace' },
  { service: { id: 'service-other', name: 'Different service' } },
  { actor: { id: 'person-1', name: 'James', provenance: 'generated' } },
])('does not join conflicting identities using the same scenario ID: %p', (changes) => {
  expect(
    buildSecuritySequences([event('first', { scenario }), event('other', { scenario, ...changes })])
  ).toHaveLength(2);
});

it('keeps scenarios separate even when they share one agent session', () => {
  expect(
    buildSecuritySequences([
      event('first', { scenario }),
      event('second', { scenario: { ...scenario, id: 'scenario-2' } }),
      event('third'),
    ])
  ).toHaveLength(3);
});

it('joins exact sessions or traces without inventing a scenario', () => {
  expect(buildSecuritySequences([event('one'), event('two')])).toMatchObject([
    { basis: 'session', findings: [{ id: 'one' }, { id: 'two' }] },
  ]);
  expect(
    buildSecuritySequences([
      event('one', { agent: undefined, traceId: 'trace-a' }),
      event('two', { agent: undefined, traceId: 'trace-a' }),
    ])
  ).toMatchObject([{ basis: 'trace', findings: [{ id: 'one' }, { id: 'two' }] }]);
});

it('never joins unrelated alerts just because the actor and timestamps match', () => {
  const sequences = buildSecuritySequences([
    event('one', { agent: undefined }),
    event('two', { agent: undefined }),
  ]);
  expect(sequences.map((sequence) => sequence.basis)).toEqual(['single', 'single']);
});

it('deduplicates by exact alert index and ID while retaining different indexes', () => {
  const sequences = buildSecuritySequences([
    event('one'),
    event('another-display-id', { source: { index: 'alerts', id: 'one' } }),
    event('one', { source: { index: 'other-alerts', id: 'one' } }),
  ]);
  expect(sequences[0].findings).toHaveLength(2);
});

it('prefers a linked scenario over newer independent alerts without dropping them', () => {
  const sequences = buildSecuritySequences([
    event('unlinked', { agent: undefined, timestamp: '2026-10-13T18:00:00Z' }),
    event('linked', { scenario }),
  ]);
  expect(sequences.map((sequence) => sequence.basis)).toEqual(['scenario', 'single']);
});

it('keeps identity IDs and display names in separate namespaces', () => {
  expect(
    buildSecuritySequences([
      event('one', { scenario, actor: { id: 'James' } }),
      event('two', { scenario, actor: { name: 'James' } }),
    ])
  ).toHaveLength(2);
});
