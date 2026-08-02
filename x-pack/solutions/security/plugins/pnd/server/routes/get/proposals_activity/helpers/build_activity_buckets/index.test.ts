/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS, RECOMMENDED_ACTIONS } from '@kbn/pnd-common';

import {
  PND_ACTIVITY_BUCKET_COUNT,
  PND_ACTIVITY_BUCKET_MS,
  resolveActivityWindow,
} from '../resolve_activity_window';
import type { PndActivityHistogramBucket } from '.';
import { buildActivityBuckets } from '.';

const NOW = Date.parse('2026-08-06T14:37:21.123Z');
const { end, start } = resolveActivityWindow(NOW);

const histogramBucket = (
  key: number,
  stepCounts: Array<[string, number]> = []
): PndActivityHistogramBucket => ({
  by_step_id: {
    buckets: stepCounts.map(([stepId, docCount]) => ({ doc_count: docCount, key: stepId })),
  },
  doc_count: stepCounts.reduce((total, [, docCount]) => total + docCount, 0),
  key,
});

const build = (buckets: PndActivityHistogramBucket[]) =>
  buildActivityBuckets({ buckets, now: NOW });

describe('buildActivityBuckets', () => {
  it('returns exactly 24 buckets when Elasticsearch returned none', () => {
    expect(build([]).length).toEqual(PND_ACTIVITY_BUCKET_COUNT);
  });

  it('zero-fills every action of a quiet hour, so a gap cannot read as an outage', () => {
    expect(build([])[0].counts).toEqual({ contain: 0, escalate: 0, investigate: 0, tune: 0 });
  });

  it('names every recommended action on every bucket', () => {
    expect(
      build([]).every(({ counts }) => Object.keys(counts).length === RECOMMENDED_ACTIONS.length)
    ).toBe(true);
  });

  it('orders the buckets oldest first', () => {
    expect(build([])[0].time).toEqual(start);
  });

  it('ends on the hour containing `now`', () => {
    expect(build([])[PND_ACTIVITY_BUCKET_COUNT - 1].time).toEqual(end);
  });

  it('walks the buckets one hour at a time', () => {
    expect(build([]).map(({ time }) => time)).toEqual(
      Array.from(
        { length: PND_ACTIVITY_BUCKET_COUNT },
        (_, index) => start + index * PND_ACTIVITY_BUCKET_MS
      )
    );
  });

  it('joins a step id to its registry recommended action', () => {
    const buckets = build([histogramBucket(start, [[PND_GATE_STEP_IDS.awaitPromoteIncident, 3]])]);

    expect(buckets[0].counts.escalate).toEqual(3);
  });

  it('leaves the other actions of a bucket at zero', () => {
    const buckets = build([histogramBucket(start, [[PND_GATE_STEP_IDS.awaitPromoteIncident, 3]])]);

    expect(buckets[0].counts).toEqual({ contain: 0, escalate: 3, investigate: 0, tune: 0 });
  });

  it('sums the four gates independently within one hour', () => {
    const buckets = build([
      histogramBucket(start, [
        [PND_GATE_STEP_IDS.awaitApplyTuning, 4],
        [PND_GATE_STEP_IDS.awaitIncidentContained, 1],
        [PND_GATE_STEP_IDS.awaitOpenInvestigation, 2],
        [PND_GATE_STEP_IDS.awaitPromoteIncident, 3],
      ]),
    ]);

    expect(buckets[0].counts).toEqual({ contain: 1, escalate: 3, investigate: 2, tune: 4 });
  });

  it('places a bucket at the hour Elasticsearch keyed it to', () => {
    const buckets = build([
      histogramBucket(start + 5 * PND_ACTIVITY_BUCKET_MS, [
        [PND_GATE_STEP_IDS.awaitOpenInvestigation, 7],
      ]),
    ]);

    expect(buckets[5].counts.investigate).toEqual(7);
  });

  /**
   * `extended_bounds` over a `now-24h` range commonly emits a 25th partial bucket. Letting it
   * through would blow the response contract's `max(24)` bound and 500 the route.
   */
  it('drops a 25th partial bucket older than the window', () => {
    const buckets = build([
      histogramBucket(start - PND_ACTIVITY_BUCKET_MS, [
        [PND_GATE_STEP_IDS.awaitOpenInvestigation, 9],
      ]),
    ]);

    expect(buckets.length).toEqual(PND_ACTIVITY_BUCKET_COUNT);
  });

  it('does not fold a dropped older bucket into the oldest kept hour', () => {
    const buckets = build([
      histogramBucket(start - PND_ACTIVITY_BUCKET_MS, [
        [PND_GATE_STEP_IDS.awaitOpenInvestigation, 9],
      ]),
    ]);

    expect(buckets[0].counts.investigate).toEqual(0);
  });

  it('ignores an unregistered step id rather than mis-attributing it', () => {
    const buckets = build([histogramBucket(start, [['await_approval', 5]])]);

    expect(buckets[0].counts).toEqual({ contain: 0, escalate: 0, investigate: 0, tune: 0 });
  });

  it('tolerates an hour whose sub-aggregation is absent', () => {
    expect(build([{ doc_count: 0, key: start }])[0].counts).toEqual({
      contain: 0,
      escalate: 0,
      investigate: 0,
      tune: 0,
    });
  });

  it('never emits a negative count', () => {
    const buckets = build([histogramBucket(start, [[PND_GATE_STEP_IDS.awaitApplyTuning, 0]])]);

    expect(buckets[0].counts.tune).toEqual(0);
  });
});
