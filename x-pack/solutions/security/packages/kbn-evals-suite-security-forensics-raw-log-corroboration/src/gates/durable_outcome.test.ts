/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildInvestigationReadbackSearch,
  evaluateDurableOutcome,
  type ReadbackHit,
} from './durable_outcome';

const RUN_ID = 'raw-log-l4-9f3c1d';
const RUN_STARTED_AT = '2026-08-18T10:00:00.000Z';

const hit = (source: Record<string, unknown>): ReadbackHit => ({ _source: source });

describe('evaluateDurableOutcome', () => {
  it('passes when a record correlated to this run stores corroboration content', () => {
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [
        hit({
          '@timestamp': '2026-08-18T10:00:05.000Z',
          summary: `Corroboration report for run ${RUN_ID}`,
          corroborated_events: ['initial-access'],
        }),
      ],
    });

    expect(result.correlatedCount).toBe(1);
    expect(result.corroborationContentStored).toBe(true);
    expect(result.success).toBe(true);
  });

  it('fails on a recent DRAFT written by an earlier run (the uncorrelated-report regression)', () => {
    // Pre-fix behaviour: any report written in the last five minutes satisfied
    // `persistedCount > 0`, so a concurrent run, a retry, or a sibling spec
    // could make this invocation green even when it persisted nothing.
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [
        hit({
          '@timestamp': '2026-08-18T10:00:30.000Z',
          report_status: 'DRAFT',
          summary: 'Corroboration report from a different run (raw-log-l4-0000aa)',
        }),
      ],
    });

    expect(result.recentCount).toBe(1);
    expect(result.correlatedCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('fails on a correlated record that carries no corroboration content', () => {
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [
        hit({
          '@timestamp': '2026-08-18T10:00:05.000Z',
          summary: `Investigation opened for run ${RUN_ID}`,
          corroborated_events: [],
        }),
      ],
    });

    expect(result.correlatedCount).toBe(1);
    expect(result.corroborationContentStored).toBe(false);
    expect(result.success).toBe(false);
  });

  it('fails on a correlated record written before the run started', () => {
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [
        hit({
          '@timestamp': '2026-08-18T09:59:59.000Z',
          summary: `Stale corroboration record for ${RUN_ID}`,
        }),
      ],
    });

    expect(result.recentCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('fails on a record with no timestamp at all (recency cannot be proven)', () => {
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [hit({ summary: `Corroboration record for ${RUN_ID}` })],
    });

    expect(result.recentCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('fails on an empty readback (nothing persisted)', () => {
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [],
    });

    expect(result).toEqual({
      recentCount: 0,
      correlatedCount: 0,
      corroborationContentStored: false,
      success: false,
    });
  });

  it('correlates on the id appearing inside the stored prose, not on exact equality', () => {
    // The worker echoes the run id into a free-text report field, so the
    // contract is containment, not equality. Pinned explicitly so switching to
    // exact matching later is a deliberate change rather than an accident.
    const result = evaluateDurableOutcome({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [
        hit({
          '@timestamp': '2026-08-18T10:00:05.000Z',
          summary: 'Corroboration report for run raw-log-l4-9f3c1d-extra',
        }),
      ],
    });

    expect(result.correlatedCount).toBe(1);
    expect(result.success).toBe(true);
  });
});

describe('buildInvestigationReadbackSearch', () => {
  it('reads the Investigation timeline bounded to the run window, newest first', () => {
    const search = buildInvestigationReadbackSearch({ runStartedAt: RUN_STARTED_AT });

    expect(search.index).toBe('.pnd-investigations');
    expect(search.query.bool.filter).toEqual([
      { range: { '@timestamp': { gte: RUN_STARTED_AT } } },
    ]);
    expect(search.sort).toEqual([{ '@timestamp': 'desc' }]);
  });
});
