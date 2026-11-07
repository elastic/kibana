/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFinding } from './security_findings/types';
import {
  entitySecuritySequences,
  filterSecurityFindingsForGraph,
  hasRecordedSecurityOrder,
  layoutSecurityEvents,
  SECURITY_EVENT_WIDTH,
} from './relationship_graph_security';

const finding: SecurityFinding = {
  id: 'alert-1',
  timestamp: '2026-10-13T20:00:00Z',
  title: 'Protected file read blocked',
  severity: 'medium',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  action: 'protected_file_access',
  target: 'Protected fixture',
  source: { index: 'alerts', id: 'alert-1' },
  ancestors: [],
  rule: { name: 'Protected file read blocked' },
  entityIds: ['canonical-alex'],
  scenario: { id: 'scenario-1', kind: 'generated', step: 1 },
};

it('anchors only structured events with an exact canonical entity link', () => {
  const wrong = {
    ...finding,
    id: 'wrong',
    entityIds: ['another-alex'],
    source: { index: 'alerts', id: 'wrong' },
  };
  const legacy = {
    ...finding,
    id: 'legacy',
    entityIds: [],
    source: { index: 'alerts', id: 'legacy' },
  };
  const ordinary = {
    ...finding,
    scenario: undefined,
    id: 'ordinary',
    source: { index: 'alerts', id: 'ordinary' },
  };
  expect(
    entitySecuritySequences([finding, wrong, legacy, ordinary], 'canonical-alex').flatMap(
      (sequence) => sequence.findings
    )
  ).toEqual([finding]);
});

it('shows recorded order only for distinct explicit steps in event order', () => {
  const second = {
    ...finding,
    id: 'alert-2',
    timestamp: '2026-10-13T20:01:00Z',
    source: { index: 'alerts', id: 'alert-2' },
    scenario: { id: 'scenario-1', kind: 'generated' as const, step: 2 },
  };
  const sequence = entitySecuritySequences([second, finding], 'canonical-alex')[0];
  expect(hasRecordedSecurityOrder(sequence)).toBe(true);
  expect(hasRecordedSecurityOrder({ ...sequence, basis: 'single' })).toBe(false);
  expect(hasRecordedSecurityOrder({ ...sequence, findings: [second, finding] })).toBe(false);
  expect(hasRecordedSecurityOrder({ ...sequence, findings: [finding, finding] })).toBe(false);
});

it('lays out a bounded set of event cards without mutating the full evidence', () => {
  const findings = Array.from({ length: 6 }, (_, index) => ({ ...finding, id: `alert-${index}` }));
  const nodes = layoutSecurityEvents(findings, 500, 600);
  expect(nodes).toHaveLength(4);
  expect(findings).toHaveLength(6);
  expect(nodes[0].y).toBe(600);
  expect(nodes[3].x + SECURITY_EVENT_WIDTH - 500).toBe(500 - nodes[0].x);
  expect(nodes[1].x).toBeGreaterThan(nodes[0].x + SECURITY_EVENT_WIDTH);
});

it('wraps to two native columns in narrow canvases without overlapping card bounds', () => {
  const findings = Array.from({ length: 4 }, (_, index) => ({ ...finding, id: `alert-${index}` }));
  const nodes = layoutSecurityEvents(findings, 300, 420, 2);
  expect(nodes[0].x).toBe(nodes[2].x);
  expect(nodes[1].x).toBe(nodes[3].x);
  expect(nodes[2].y).toBeGreaterThan(nodes[0].y + 108);
  expect(nodes[1].x + SECURITY_EVENT_WIDTH).toBeLessThan(600);
});

it.each([
  ['24h', 1],
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
] as const)('applies inclusive observed-time boundaries for the %s graph window', (range, days) => {
  const now = Date.parse('2026-10-14T00:00:00Z');
  const from = now - days * 24 * 60 * 60 * 1000;
  const atStart = { ...finding, id: 'start', timestamp: new Date(from).toISOString() };
  const atEnd = { ...finding, id: 'end', timestamp: new Date(now).toISOString() };
  const before = {
    ...finding,
    id: 'before',
    timestamp: new Date(from - 1).toISOString(),
    detectedAt: new Date(now).toISOString(),
  };
  const after = { ...finding, id: 'after', timestamp: new Date(now + 1).toISOString() };
  const invalid = { ...finding, id: 'invalid', timestamp: 'not-a-date' };
  expect(
    filterSecurityFindingsForGraph([atStart, atEnd, before, after, invalid], range, ['medium'], now)
  ).toEqual([atStart, atEnd]);
});

it('honors selected severities, including when no severity is selected', () => {
  const now = Date.parse('2026-10-14T00:00:00Z');
  const high = { ...finding, id: 'high', severity: 'high' as const };
  expect(filterSecurityFindingsForGraph([finding, high], '24h', ['high'], now)).toEqual([high]);
  expect(filterSecurityFindingsForGraph([finding, high], '24h', [], now)).toEqual([]);
});
