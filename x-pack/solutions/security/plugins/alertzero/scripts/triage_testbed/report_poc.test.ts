/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JEV_LANE_TAG_PREFIX, JEV_VERDICT_TAG } from '../../server/alert_triage/jev_first_line';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import { buildPocSection, pocNote } from './report_poc';
import type { TaggedAlert, Truth } from './report_run';

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
