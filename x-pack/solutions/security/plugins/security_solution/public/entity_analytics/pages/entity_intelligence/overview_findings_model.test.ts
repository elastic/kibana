/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupOverviewFindings } from './overview_findings_model';
import type { SecurityFinding } from './security_findings/types';

const finding: SecurityFinding = {
  id: 'alert-a',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Customer access policy matched',
  severity: 'high',
  status: 'open',
  kind: 'policy_violation',
  outcome: 'unknown',
  agent: { id: 'agent-a', provider: 'google_adk', sessionId: 'session-a' },
  rule: { id: 'rule-a', name: 'Customer access' },
  source: { index: 'alerts', id: 'alert-a' },
  ancestors: [],
  entityIds: [],
};

it('prioritizes reviewable detections before confirmed blocks and closed alerts', () => {
  const groups = groupOverviewFindings([
    { ...finding, id: 'blocked', outcome: 'blocked', severity: 'critical' },
    { ...finding, id: 'closed', status: 'closed' },
    { ...finding, id: 'unknown-status', status: 'unknown' },
  ]);
  expect(groups.map(({ category }) => category)).toEqual(['review', 'blocked', 'closed']);
  expect(groups[0].findings[0].outcome).toBe('unknown');
});

it('groups repeats across sessions while preserving every exact alert reference', () => {
  const earlier = { ...finding, id: 'earlier', source: { index: 'alerts', id: 'earlier' } };
  const latest = {
    ...finding,
    id: 'latest',
    timestamp: '2026-10-14T13:00:00Z',
    agent: {
      ...finding.agent,
      id: 'agent-a',
      provider: 'google_adk' as const,
      sessionId: 'session-b',
    },
    source: { index: 'alerts', id: 'latest' },
  };
  const groups = groupOverviewFindings([earlier, latest]);
  expect(groups).toHaveLength(1);
  expect(groups[0].findings.map(({ source }) => source.id)).toEqual(['latest', 'earlier']);
  expect(earlier.id).toBe('earlier');
});

it('keeps different runtimes, outcomes and unknown identities separate', () => {
  const groups = groupOverviewFindings([
    finding,
    { ...finding, agent: { id: 'agent-b', provider: 'google_adk' } },
    { ...finding, outcome: 'allowed' },
    { ...finding, agent: undefined, source: { index: 'alerts', id: 'unattributed-a' } },
    { ...finding, agent: undefined, source: { index: 'alerts', id: 'unattributed-b' } },
  ]);
  expect(groups).toHaveLength(5);
});

it('uses the highest-severity alert as the representative, then the newest at that severity', () => {
  const groups = groupOverviewFindings([
    { ...finding, id: 'new-low', severity: 'low', timestamp: '2026-10-14T15:00:00Z' },
    { ...finding, id: 'old-critical', severity: 'critical', timestamp: '2026-10-14T12:00:00Z' },
    { ...finding, id: 'new-critical', severity: 'critical', timestamp: '2026-10-14T14:00:00Z' },
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].findings.map(({ id }) => id)).toEqual([
    'new-critical',
    'old-critical',
    'new-low',
  ]);
});

it('keeps closed blocked alerts separate from active blocked alerts and sorts them last', () => {
  const groups = groupOverviewFindings([
    {
      ...finding,
      id: 'closed-blocked',
      status: 'closed',
      outcome: 'blocked',
      severity: 'critical',
    },
    { ...finding, id: 'active-blocked', outcome: 'blocked', severity: 'low' },
    { ...finding, id: 'to-review', outcome: 'unknown', severity: 'medium' },
  ]);
  expect(groups.map(({ category }) => category)).toEqual(['review', 'blocked', 'closed']);
  expect(groups.map(({ findings }) => findings[0].id)).toEqual([
    'to-review',
    'active-blocked',
    'closed-blocked',
  ]);
});

const invocation: NonNullable<SecurityFinding['invocation']> = {
  toolCallId: 'call-export',
  toolName: 'export_case_summary',
  source: { index: 'google-native-observations', id: 'export-observation' },
  inputRecordHash: 'immutable-input-hash',
  inputSource: 'tool_arguments',
  correlation: 'exact_native_observation',
  input: '{"case":"CASE-001"}',
  inputRedacted: false,
  inputTruncated: false,
};

it('puts monitor and block evidence for one exact invocation in one blocked group', () => {
  const monitored = { ...finding, invocation, severity: 'critical' as const };
  const blocked: SecurityFinding = {
    ...finding,
    id: 'block',
    title: 'Google denied the export',
    invocation,
    outcome: 'blocked',
    rule: { id: 'native-block-rule', name: 'Google native export control' },
    source: { index: 'alerts', id: 'block' },
  };
  const groups = groupOverviewFindings([monitored, blocked]);
  expect(groups).toHaveLength(1);
  expect(groups[0].category).toBe('blocked');
  expect(groups[0].representative).toBe(blocked);
  expect(groups[0].findings).toEqual([monitored, blocked]);
});

it('does not move a monitor alert out of review when the blocked call reference differs', () => {
  const groups = groupOverviewFindings([
    { ...finding, invocation },
    {
      ...finding,
      outcome: 'blocked',
      invocation: { ...invocation, inputRecordHash: 'different-input-hash' },
    },
  ]);
  expect(groups.map(({ category }) => category)).toEqual(['review', 'blocked']);
});

it('does not move active monitor evidence into a closed blocked group', () => {
  const groups = groupOverviewFindings([
    { ...finding, invocation },
    { ...finding, invocation, outcome: 'blocked', status: 'closed' },
  ]);
  expect(groups.map(({ category }) => category)).toEqual(['review', 'closed']);
});

it('keeps conflicting allowed evidence reviewable even with the same invocation reference', () => {
  const groups = groupOverviewFindings([
    { ...finding, invocation, outcome: 'allowed' },
    { ...finding, invocation, outcome: 'blocked' },
  ]);
  expect(groups.map(({ category }) => category)).toEqual(['review', 'blocked']);
});
