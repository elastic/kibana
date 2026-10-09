/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntCoordinatorResponse } from '@kbn/alertzero-common';
import { isCoordinatorResponse, wireToCoordinatorRun } from './wire_adapter';

type Tier1 = HuntCoordinatorResponse['tier1'];

const DNS_INDEX = '.ds-logs-dns-default-2026.10.09-000001';
const ENDPOINT_INDEX = '.ds-logs-endpoint-default-1';

const tier1Base: Tier1 = {
  status: 'environment_hits_found',
  has_confirmed_hit: true,
  searched_iocs: 2,
  searched_techniques: 0,
  resolved_iocs: [{ type: 'domain', value: 'evil.example' }],
  resolved_techniques: [],
  time_range: { from: 'now-30d', to: 'now' },
  counts: { total_hits: 4, returned_hits: 4, affected_hosts: 1, affected_users: 0 },
  hits: [
    {
      id: 'sample-a#0#positive',
      index: DNS_INDEX,
      matched: { ioc: { type: 'domain', value: 'evil.example' } },
    },
    {
      id: 'sample-b#1#positive',
      index: DNS_INDEX,
      matched: { ioc: { type: 'domain', value: 'evil.example' } },
    },
    {
      id: 'sample-c#0#positive',
      index: DNS_INDEX,
      matched: { ioc: { type: 'ip', value: '203.0.113.9' } },
    },
    // A hit with no IoC match is still a hit but belongs to no IoC group.
    { id: 'sample-d#0#positive', index: ENDPOINT_INDEX },
  ],
  affected_assets: { hosts: [], users: [], services: [] },
  per_index: [],
  tier: 1,
};

/**
 * Typed as the zod-inferred wire type: a rename or removal in
 * hunt_coordinator_route.gen.ts fails type_check on this literal, not the
 * live run. Hand-written to the schema; it is NOT captured from a real stack
 * execution (that needs the live run).
 */
const wire: HuntCoordinatorResponse = {
  status: 'tier1_and_tier2',
  report_id: 'r1',
  run_id: 'run-1',
  index_patterns: ['logs-*'],
  tier2_targets: ['logs-endpoint*'],
  tier2_target_sources: ['tier1_hits'],
  actionable_indices: [],
  tier1: tier1Base,
  tier2: {
    status: 'behaviors_proposed',
    behaviors: [
      {
        technique_id: 'T1218.005',
        evidence_quote: 'mshta.exe spawned a script host',
        llm_confidence: 0.9,
        confidence: 0.9,
        technique_name: 'Mshta',
        title: 'Mshta',
        validated_esql: 'FROM logs-* | LIMIT 1',
        reference: 'https://attack.mitre.org/techniques/T1218/005/',
        tactic_ids: ['TA0005'],
        severity: 'high',
        risk_score: 73,
        execution: { executed: true, row_count: 1, hit: true },
        hits: [{ id: 'sample-e#2#positive', index: ENDPOINT_INDEX }],
      },
      {
        technique_id: 'T1059.001',
        evidence_quote: 'encoded command line',
        llm_confidence: 0.7,
        confidence: 0.7,
        technique_name: 'PowerShell',
        title: 'PowerShell',
        validated_esql: 'FROM logs-* | LIMIT 1',
        reference: 'https://attack.mitre.org/techniques/T1059/001/',
        tactic_ids: ['TA0002'],
        severity: 'medium',
        risk_score: 47,
        execution: {
          executed: true,
          row_count: 0,
          hit: false,
          inconclusive_reason: 'execute_failed',
        },
      },
      {
        technique_id: 'T1003',
        evidence_quote: 'lsass access',
        llm_confidence: 0.6,
        confidence: 0.6,
        technique_name: 'OS Credential Dumping',
        title: 'OS Credential Dumping',
        validated_esql: 'FROM logs-* | LIMIT 1',
        reference: 'https://attack.mitre.org/techniques/T1003/',
        tactic_ids: ['TA0006'],
        severity: 'high',
        risk_score: 60,
        // never executed: no `execution` block at all
      },
    ],
    indexed_behaviors: [],
    next_step: 'review',
    has_hit: true,
  },
  message: 'ok',
  next_step: 'review',
  has_confirmed_hit: true,
  completed_successfully: false,
  completeness: 'incomplete_retryable',
  incomplete: [{ reason: 'execute_failed', detail: 'one behaviour failed to execute' }],
};

describe('wireToCoordinatorRun', () => {
  const run = wireToCoordinatorRun(wire);

  it('maps tier1 status, hits (id/index -> _id/_index) and incompleteness reasons', () => {
    expect(run.tier1_status).toBe('environment_hits_found');
    expect(run.tier1_hits).toEqual([
      { _id: 'sample-a#0#positive', _index: DNS_INDEX },
      { _id: 'sample-b#1#positive', _index: DNS_INDEX },
      { _id: 'sample-c#0#positive', _index: DNS_INDEX },
      { _id: 'sample-d#0#positive', _index: ENDPOINT_INDEX },
    ]);
    expect(run.tier1_incomplete).toEqual([]);
  });

  it('groups tier1 hits per matched IoC value and leaves unmatched hits out of every group', () => {
    expect(run.tier1_matched_iocs).toEqual([
      {
        value: 'evil.example',
        hits: [
          { _id: 'sample-a#0#positive', _index: DNS_INDEX },
          { _id: 'sample-b#1#positive', _index: DNS_INDEX },
        ],
      },
      { value: '203.0.113.9', hits: [{ _id: 'sample-c#0#positive', _index: DNS_INDEX }] },
    ]);
  });

  it('reads tier2.behaviors (American spelling) with execution.* and per-behaviour hit refs', () => {
    expect(run.behaviours).toEqual([
      {
        executed: true,
        hit: true,
        reason: undefined,
        technique_id: 'T1218.005',
        hits: [{ _id: 'sample-e#2#positive', _index: ENDPOINT_INDEX }],
      },
      {
        executed: true,
        hit: false,
        reason: 'execute_failed',
        technique_id: 'T1059.001',
        hits: [],
      },
      { executed: false, hit: false, reason: undefined, technique_id: 'T1003', hits: [] },
    ]);
  });

  it('passes completeness and tier2 target sources through from the top level', () => {
    expect(run.completeness).toBe('incomplete_retryable');
    expect(run.tier2_target_sources).toEqual(['tier1_hits']);
  });

  it('adapts a run whose tier2 is null to no behaviours and keeps the skipped reason', () => {
    const noTier2 = wireToCoordinatorRun({
      ...wire,
      status: 'tier1_only',
      tier2: null,
      tier2_skipped_reason: 'tier2_when_never',
      completeness: 'complete',
      tier1: { ...tier1Base, status: 'no_environment_hits', hits: [], has_confirmed_hit: false },
    });
    expect(noTier2.behaviours).toEqual([]);
    expect(noTier2.tier2_skipped_reason).toBe('tier2_when_never');
    expect(noTier2.tier1_hits).toEqual([]);
    expect(noTier2.tier1_status).toBe('no_environment_hits');
  });

  it('carries tier1.incomplete reasons', () => {
    const r = wireToCoordinatorRun({
      ...wire,
      tier1: { ...tier1Base, incomplete: [{ reason: 'index_unavailable', detail: 'x' }] },
    });
    expect(r.tier1_incomplete).toEqual(['index_unavailable']);
  });
});

describe('isCoordinatorResponse', () => {
  it('accepts a coordinator response', () => {
    expect(isCoordinatorResponse(wire)).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['the on-failure fallback', { status: 'failed', error: 'boom' }],
    ['a flat pre-adapter shape', { tier1_status: 'no_environment_hits', behaviours: [] }],
    ['tier1 without hits', { tier1: { status: 'x' }, completeness: 'complete' }],
    ['no completeness', { tier1: { status: 'x', hits: [] } }],
  ])('rejects %s', (_name, value) => {
    expect(isCoordinatorResponse(value)).toBe(false);
  });
});
