/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  JEV_AUDIT_TAG,
  JEV_LANE_TAG_PREFIX,
  JEV_VERDICT_TAG,
} from '../../server/alert_triage/jev_first_line';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import { buildPocSection, buildWaitSection, pocNote } from './report_poc';
import type { ModelCall, Sweep, TaggedAlert, Truth } from './report_run';

const record = (keyHash: string, verdict: string): VerdictCacheRecord =>
  ({ keyHash, verdict, state: 'active' } as unknown as VerdictCacheRecord);

const alert = (id: string, tags: string[], buildingBlock = false): TaggedAlert => ({
  id,
  timestamp: '2026-11-18T10:00:00.000Z',
  tags,
  buildingBlock,
});

const truthOf = (entries: Record<string, 'true_positive' | 'false_positive'>): Truth =>
  new Map(Object.entries(entries).map(([id, verdict]) => [id, { verdict }]));

const R1 = verdictCacheId('hash-1');

describe('buildPocSection', () => {
  it('tells the source of a verdict by its provenance tag, and counts the wrong ones against the truth', () => {
    const section = buildPocSection({
      alerts: [
        alert('m1', ['az:true_positive']),
        alert('c1', ['az:false_positive', `${TRIAGE_CACHE_REUSE_TAG_PREFIX}${R1}`]),
        alert('c2', ['az:false_positive', `${TRIAGE_CACHE_REUSE_TAG_PREFIX}${R1}`]),
        alert('j1', ['az:false_positive', JEV_VERDICT_TAG]),
      ],
      truth: truthOf({
        m1: 'true_positive',
        c1: 'false_positive',
        c2: 'true_positive',
        j1: 'true_positive',
      }),
      records: [],
      verdictsPerHour: null,
    });

    expect(section.bySource.model).toMatchObject({ verdicts: 1, wrong: 0 });
    expect(section.bySource.cache).toMatchObject({
      verdicts: 2,
      wrong: 1,
      wrongRate: 0.5,
      truePositivesGotFalsePositive: 1,
    });
    expect(section.bySource.jev).toMatchObject({ verdicts: 1, wrong: 1, wrongRate: 1 });
    expect(section.jev).toMatchObject({
      applied: 1,
      appliedTruePositives: 1,
      appliedTruePositiveShare: 1,
    });
  });

  it('does not count an inconclusive verdict as wrong', () => {
    const section = buildPocSection({
      alerts: [alert('c1', ['az:inconclusive', `${TRIAGE_CACHE_REUSE_TAG_PREFIX}${R1}`])],
      truth: truthOf({ c1: 'true_positive' }),
      records: [],
      verdictsPerHour: null,
    });

    expect(section.bySource.cache).toMatchObject({ verdicts: 1, inconclusive: 1, wrong: 0 });
  });

  it('counts the verdicts of alerts that are not building blocks, and divides by the hours of the scorecard', () => {
    const section = buildPocSection({
      alerts: [
        alert('a', ['az:false_positive'], true),
        alert('b', ['az:false_positive']),
        alert('c', ['az:true_positive']),
        alert('d', ['az:true_positive']),
      ],
      truth: truthOf({
        a: 'false_positive',
        b: 'false_positive',
        c: 'true_positive',
        d: 'true_positive',
      }),
      records: [],
      verdictsPerHour: 2, // 4 verdicts in 2 hours
    });

    expect(section.nonBuildingBlock).toEqual({ verdicts: 3, perHour: 1.5 });
  });

  it('compares the fresh verdict of an audit alert with its record and with the truth', () => {
    const section = buildPocSection({
      alerts: [
        // The record says false positive. The model agrees and is right.
        alert('a1', ['az:false_positive', `${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${R1}`]),
        // The model disagrees with the record and is right: the record is wrong for this alert.
        alert('a2', ['az:true_positive', `${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${R1}`]),
        alert('a4', ['az:false_positive', `${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${R1}`]),
        // An audit alert that has no verdict yet is not compared.
        alert('a3', [`${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${R1}`]),
      ],
      truth: truthOf({
        a1: 'false_positive',
        a2: 'true_positive',
        a3: 'false_positive',
        a4: 'false_positive',
      }),
      records: [record('hash-1', 'false_positive')],
      verdictsPerHour: null,
    });

    expect(section.audit).toMatchObject({
      sampled: 3,
      compared: 3,
      agreedWithRecord: 2,
      agreedWithRecordShare: 0.6667,
      freshWrongAgainstTruth: 0,
      recordWrongAgainstTruth: 1,
    });
  });

  it('keeps an audit alert out of the cache source, because the model gave its verdict', () => {
    const section = buildPocSection({
      alerts: [alert('a1', ['az:false_positive', `${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${R1}`])],
      truth: truthOf({ a1: 'false_positive' }),
      records: [record('hash-1', 'false_positive')],
      verdictsPerHour: null,
    });

    expect(section.bySource.model.verdicts).toBe(1);
    expect(section.bySource.cache.verdicts).toBe(0);
  });

  it('counts the alerts of each Jev lane against the truth, also when they have no verdict (shadow mode)', () => {
    const section = buildPocSection({
      alerts: [
        alert('b1', [`${JEV_LANE_TAG_PREFIX}benign`]),
        alert('b2', [`${JEV_LANE_TAG_PREFIX}benign`]),
        alert('x1', [`${JEV_LANE_TAG_PREFIX}attack`]),
        alert('m1', [`${JEV_LANE_TAG_PREFIX}middle`, 'az:true_positive']),
      ],
      truth: truthOf({
        b1: 'false_positive',
        b2: 'true_positive',
        x1: 'true_positive',
        m1: 'true_positive',
      }),
      records: [],
      verdictsPerHour: null,
    });

    expect(section.jev.lanes).toEqual({
      benign: { alerts: 2, truePositive: 1, falsePositive: 1 },
      attack: { alerts: 1, truePositive: 1, falsePositive: 0 },
      middle: { alerts: 1, truePositive: 1, falsePositive: 0 },
    });
    expect(section.jev.applied).toBe(0);
  });

  it('compares the model verdict of a Jev audit alert with Jev, and counts the attacks that Jev missed', () => {
    const section = buildPocSection({
      alerts: [
        // The model agrees with Jev, and the alert is harmless.
        alert('a1', [`${JEV_LANE_TAG_PREFIX}benign`, JEV_AUDIT_TAG, 'az:false_positive']),
        // The model finds an attack that Jev put in the benign lane.
        alert('a2', [`${JEV_LANE_TAG_PREFIX}benign`, JEV_AUDIT_TAG, 'az:true_positive']),
        // An attack in the sample that the model has not analyzed yet is still a Jev miss.
        alert('a3', [`${JEV_LANE_TAG_PREFIX}benign`, JEV_AUDIT_TAG]),
        // The model is wrong: it calls an attack harmless.
        alert('a4', [`${JEV_LANE_TAG_PREFIX}benign`, JEV_AUDIT_TAG, 'az:false_positive']),
        // Not in the sample: Jev applied its verdict.
        alert('j1', [`${JEV_LANE_TAG_PREFIX}benign`, 'az:false_positive', JEV_VERDICT_TAG]),
      ],
      truth: truthOf({
        a1: 'false_positive',
        a2: 'true_positive',
        a3: 'true_positive',
        a4: 'true_positive',
        j1: 'false_positive',
      }),
      records: [],
      verdictsPerHour: null,
    });

    expect(section.jev.audit).toEqual({
      sampled: 4,
      attacksInSample: 3,
      compared: 3,
      agreedWithJev: 2,
      agreedWithJevShare: 0.6667,
      modelWrongAgainstTruth: 1,
    });
    // The audit alerts are verdicts of the model, not of Jev.
    expect(section.bySource.jev.verdicts).toBe(1);
    expect(section.bySource.model.verdicts).toBe(3);
  });

  it('says in one sentence where the verdicts came from', () => {
    const section = buildPocSection({
      alerts: [alert('j1', ['az:false_positive', JEV_VERDICT_TAG])],
      truth: truthOf({ j1: 'true_positive' }),
      records: [],
      verdictsPerHour: null,
    });

    expect(pocNote(section)).toContain('Jev 1 (1 true positives, 100.0%)');
  });
});

describe('buildWaitSection', () => {
  const at = (minutes: number): string =>
    new Date(Date.UTC(2026, 10, 18, 10, minutes)).toISOString();
  const created = (
    id: string,
    minute: number,
    tags: string[],
    buildingBlock = false
  ): TaggedAlert => ({
    id,
    timestamp: at(minute),
    tags,
    buildingBlock,
  });
  const callOf = (ids: string[], finishedMinute: number): ModelCall => ({
    startedAt: at(finishedMinute - 1),
    finishedAt: at(finishedMinute),
    status: 'completed',
    prompt: ids.map((id) => `<alert id="${id}">`).join('\n'),
  });
  const sweepAt = (minute: number): Sweep => ({ startedAt: at(minute) });

  it('counts the alerts that Jev settled, not only the ones that the model analyzed', () => {
    const section = buildWaitSection({
      alerts: [
        created('m1', 0, ['az:true_positive']),
        created('j1', 1, ['az:false_positive', JEV_VERDICT_TAG]),
        created('j2', 16, ['az:false_positive', JEV_VERDICT_TAG]),
      ],
      calls: [callOf(['m1'], 70)],
      sweeps: [sweepAt(15), sweepAt(30)],
    });

    expect(section.alertsWithTime).toBe(3);
    // m1 waited 70 minutes (its call), j1 14 minutes (the sweep at 15), j2 14 minutes (the sweep at 30).
    expect(section.bySource.model).toEqual({ count: 1, p50Seconds: 4200 });
    expect(section.bySource.jev).toEqual({ count: 2, p50Seconds: 840 });
    expect(section.within).toEqual({ '15': 2, '30': 2, '60': 2 });
    expect(section.p95Seconds).toBe(4200);
  });

  it('gives an alert that has a verdict tag and no time to the alerts without a time', () => {
    const section = buildWaitSection({
      // A cache verdict on an alert that is newer than the last sweep, and a model verdict that no call lists.
      alerts: [
        created('c1', 40, [`az:false_positive`, `${TRIAGE_CACHE_REUSE_TAG_PREFIX}x`]),
        created('m1', 0, ['az:true_positive']),
      ],
      calls: [],
      sweeps: [sweepAt(15), sweepAt(30)],
    });

    expect(section.alertsWithTime).toBe(0);
    expect(section.alertsWithoutTime).toBe(2);
  });

  it('counts the alerts without a verdict against the share, so that unserved alerts are not hidden', () => {
    const section = buildWaitSection({
      alerts: [created('j1', 1, ['az:false_positive', JEV_VERDICT_TAG])],
      calls: [],
      sweeps: [sweepAt(15)],
      counts: { nonBuildingBlock: 10, nonBuildingBlockWithoutVerdict: 9 },
    });

    expect(section.within['60']).toBe(1);
    expect(section.shareOfAllWithin['60']).toBe(0.1);
    expect(section.nonBuildingBlockWithoutVerdict).toBe(9);
    expect(section.closedWithoutVerdict).toBeNull();
  });

  it('reports the alerts closed without a verdict apart, so that they are not read as backlog', () => {
    const section = buildWaitSection({
      alerts: [],
      calls: [],
      sweeps: [sweepAt(15)],
      counts: { nonBuildingBlock: 7, nonBuildingBlockWithoutVerdict: 3, closedWithoutVerdict: 2 },
    });

    expect(section.closedWithoutVerdict).toBe(2);
  });

  it('leaves out an alert that has no verdict tag', () => {
    const section = buildWaitSection({
      alerts: [created('a1', 0, ['az:triage_pending'])],
      calls: [callOf(['a1'], 5)],
      sweeps: [sweepAt(15)],
    });

    expect(section.alertsWithTime).toBe(0);
    expect(section.p50Seconds).toBeNull();
  });

  describe('by severity', () => {
    const withSeverity = (tagged: TaggedAlert, severity?: string): TaggedAlert => ({
      ...tagged,
      ...(severity ? { severity } : {}),
    });
    const section = buildWaitSection({
      alerts: [
        withSeverity(created('h1', 0, ['az:true_positive']), 'high'),
        withSeverity(created('h2', 0, ['az:true_positive']), 'high'),
        withSeverity(created('l1', 0, ['az:false_positive']), 'low'),
        withSeverity(created('l2', 1, ['az:false_positive', JEV_VERDICT_TAG]), 'low'),
        withSeverity(created('b1', 0, ['az:false_positive'], true), 'high'),
        created('u1', 0, ['az:false_positive']),
      ],
      calls: [callOf(['h1'], 10), callOf(['h2'], 20), callOf(['l1', 'b1', 'u1'], 90)],
      sweeps: [sweepAt(15)],
      counts: {
        nonBuildingBlock: 8,
        nonBuildingBlockWithoutVerdict: 3,
        bySeverity: {
          high: { alerts: 3, withoutVerdict: 1 },
          low: { alerts: 3, withoutVerdict: 1 },
          medium: { alerts: 1, withoutVerdict: 1 },
          unknown: { alerts: 1, withoutVerdict: 0 },
        },
      },
    });

    it('gives the wait of the high alerts apart, the alerts that a held rule must not delay', () => {
      // h1 waited 10 minutes and h2 20 minutes. The building block b1 is high too, but it is left out.
      expect(section.bySeverity.high).toEqual({
        alerts: 3,
        withVerdict: 2,
        withoutVerdict: 1,
        shareWithin60: Number((2 / 3).toFixed(4)),
        p50Seconds: 600,
        p95Seconds: 1200,
        model: { count: 2, p50Seconds: 600, p95Seconds: 1200 },
      });
    });

    it('splits the model wait from the Jev wait, because only the model path is held', () => {
      // l1 waited 90 minutes for the model, l2 14 minutes for Jev (the sweep at 15).
      expect(section.bySeverity.low.model).toEqual({
        count: 1,
        p50Seconds: 5400,
        p95Seconds: 5400,
      });
      expect(section.bySeverity.low.withVerdict).toBe(2);
      expect(section.bySeverity.low.shareWithin60).toBe(Number((1 / 3).toFixed(4)));
    });

    it('lists a severity that has alerts but no verdict, and an alert without a severity as unknown', () => {
      expect(section.bySeverity.medium).toMatchObject({
        alerts: 1,
        withVerdict: 0,
        withoutVerdict: 1,
        p50Seconds: null,
      });
      expect(section.bySeverity.unknown).toMatchObject({ alerts: 1, withVerdict: 1 });
    });
  });
});
