/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { Parser } from '@elastic/esql';
import { wrapReading } from '../../signals/wrap_reading';
import { compileDataStartQuery } from './compile_known_failure_query';
import type { KnownFailureRise } from './judge_known_failure';
import { toRiseReading, toUnusualMinuteReading } from './to_reading';

const KNOWLEDGE_INDICATOR: QueryLink = {
  query: {
    id: 'ki-timeouts',
    title: 'Checkout timeouts',
    description: 'Checkout calls time out',
    esql: { query: 'FROM logs | WHERE message : "timeout" | KEEP message' },
    severity_score: 70,
    type: 'match',
    features: [{ id: 'checkout' }],
  },
  source_id: 'source-1',
  rule_backed: false,
  rule_id: 'sig-rule-1',
};

const CONTEXT = {
  knowledgeIndicator: KNOWLEDGE_INDICATOR,
  ruleId: 'rule-1',
  entity: { type: 'service', name: 'checkout' } as const,
  sourceTitle: 'Checkout logs',
  cpsEnabled: false,
};
const BASELINE = { median: 2, mad: 1, mean: 2, std_dev: 0.8 };
const UNUSUAL = {
  minute: Date.UTC(2026, 10, 20, 10, 27),
  count: 40,
  threshold: 8,
  baseline: BASELINE,
};
const LASTING_RISE: KnownFailureRise = {
  check: 'lasting_rise',
  since: Date.UTC(2026, 10, 20, 9, 50),
  level_before: 5,
  level_now: 11,
  rise: 5,
  min_rise: 3,
  change: {
    at: Date.UTC(2026, 10, 20, 9, 50),
    type: 'step_change',
    pvalue: 1e-20,
    before_median: 5,
    before_minutes: 300,
    after_median: 10,
  },
};
const RISE = { ...CONTEXT, rise: LASTING_RISE, lastMinute: Date.UTC(2026, 10, 20, 10, 30) };

describe('toUnusualMinuteReading', () => {
  it('reports the minute with the threshold it was judged against and its newest lines', () => {
    expect(toUnusualMinuteReading({ ...CONTEXT, unusual: UNUSUAL })).toEqual({
      status: 'breached',
      fingerprint: 'known_failures:ki-timeouts',
      rule_id: 'rule-1',
      source_id: 'source-1',
      entity: { type: 'service', name: 'checkout' },
      bucket_start: Date.UTC(2026, 10, 20, 10, 27),
      bucket_end: Date.UTC(2026, 10, 20, 10, 28),
      value: 40,
      unit: 'count',
      title: 'Checkout timeouts',
      description: 'Checkout calls time out',
      importance: 70,
      // Capped before the indicator's KEEP, so a KEEP without @timestamp cannot break the sort.
      evidence_esql:
        'FROM logs\n| WHERE message : "timeout"\n| WHERE @timestamp >= "2026-11-20T10:27:00.000Z" AND @timestamp < "2026-11-20T10:28:00.000Z"\n| SORT @timestamp DESC\n| LIMIT 100\n| KEEP message',
      role: 'primary',
      compare_with_normal: false,
      quiet_period_minutes: 10,
      details: {
        check: 'unusual_minute',
        value_is: 'matches in the minute',
        minute: '2026-11-20T10:27:00.000Z',
        threshold: 8,
        normal_level: 2,
        baseline: BASELINE,
        ki_id: 'ki-timeouts',
        source_title: 'Checkout logs',
        linked_feature_ids: ['checkout'],
      },
    });
  });

  it('routes the evidence query across projects when cross-project search is on', () => {
    expect(
      toUnusualMinuteReading({ ...CONTEXT, cpsEnabled: true, unusual: UNUSUAL }).evidence_esql
    ).toMatch(/^SET project_routing=".+";\nFROM logs/);
  });

  // The rule's length check leaves KEEP out, so a long one could push the evidence past the signal
  // format and drop the whole reading.
  it('counts the matches per minute when the indicator’s KEEP would not fit a signal', () => {
    const keep = `KEEP ${Array.from({ length: 2_000 }, (_, index) => `field_${index}`).join(', ')}`;
    const reading = toUnusualMinuteReading({
      ...CONTEXT,
      knowledgeIndicator: {
        ...KNOWLEDGE_INDICATOR,
        query: {
          ...KNOWLEDGE_INDICATOR.query,
          esql: { query: `FROM logs | WHERE message : "timeout" | ${keep}` },
        },
      },
      unusual: UNUSUAL,
    });

    // Not the lines without the KEEP: those would show the fields the indicator left out.
    expect(reading.evidence_esql).toMatch(/\| STATS matches = COUNT\(\*\) BY period/);
    expect(reading.evidence_esql).not.toMatch(/field_0/);
    expect(
      wrapReading({
        reading,
        strategyId: 'known_failures',
        strategyVersion: 1,
        spaceId: 'default',
        scheduledMinute: Date.UTC(2026, 10, 20, 10, 35),
      })
    ).toMatchObject({ dropped: false });
  });

  // The knowledge indicator write path stores any score; the signal format only accepts 0 to 100.
  it.each([
    [150, 100],
    [undefined, 50],
  ])('keeps a severity score of %s within the signal format as %s', (severityScore, importance) => {
    const reading = toUnusualMinuteReading({
      ...CONTEXT,
      knowledgeIndicator: {
        ...KNOWLEDGE_INDICATOR,
        query: { ...KNOWLEDGE_INDICATOR.query, severity_score: severityScore },
      },
      unusual: UNUSUAL,
    });

    expect(reading.importance).toBe(importance);
  });
});

describe('toRiseReading', () => {
  // The newest minute, so the reading cannot land on a minute an unusual-minute reading holds.
  it('reports a lasting rise on the newest minute, with the matches per minute around it', () => {
    expect(toRiseReading(RISE)).toEqual(
      expect.objectContaining({
        bucket_start: Date.UTC(2026, 10, 20, 10, 30),
        bucket_end: Date.UTC(2026, 10, 20, 10, 31),
        value: 11,
        // An hour of the level before, so the rise shows against it; counts, not every line.
        evidence_esql:
          'FROM logs\n| WHERE message : "timeout"\n| WHERE @timestamp >= "2026-11-20T08:50:00.000Z" AND @timestamp < "2026-11-20T10:31:00.000Z"\n| STATS matches = COUNT(*) BY period = BUCKET(@timestamp, 1 minutes, "2026-11-20T08:50:00.000Z", "2026-11-20T10:31:00.000Z", {"include_empty_buckets": true})\n| SORT period',
        details: expect.objectContaining({
          check: 'lasting_rise',
          value_is: 'median matches per minute over the last 15 minutes',
          since: '2026-11-20T09:50:00.000Z',
          normal_level: 5,
          rise: 5,
          min_rise: 3,
          change_type: 'step_change',
          minutes_before_change: 300,
          level_after_change: 10,
        }),
      })
    );
  });

  it('reports a slow rise with the matches per ten minutes over the whole window', () => {
    const reading = toRiseReading({
      ...RISE,
      rise: { ...LASTING_RISE, check: 'slow_rise', change: undefined },
    });

    expect(reading.evidence_esql).toContain(
      '@timestamp >= "2026-11-20T04:31:00.000Z" AND @timestamp < "2026-11-20T10:31:00.000Z"\n| STATS matches = COUNT(*) BY period = BUCKET(@timestamp, 10 minutes, '
    );
    expect(reading.details).not.toHaveProperty('change_type');
  });
});

// A query that does not parse ships broken evidence, or a data-start lookup that fails every tick.
describe('Known failures queries', () => {
  it.each([
    [
      'an unusual minute’s lines',
      toUnusualMinuteReading({ ...CONTEXT, unusual: UNUSUAL }).evidence_esql,
    ],
    ['a rise’s counts', toRiseReading(RISE).evidence_esql],
    [
      'the data start',
      compileDataStartQuery({
        esql: KNOWLEDGE_INDICATOR.query.esql.query,
        from: UNUSUAL.minute,
        cpsEnabled: false,
      }),
    ],
  ])('builds %s as ES|QL that parses', (_label, query) => {
    expect(Parser.parse(query).errors).toEqual([]);
  });
});

// The engine drops a reading the signal format rejects, so a mismatch would store nothing.
describe('Known failures readings', () => {
  it.each([
    ['an unusual minute', toUnusualMinuteReading({ ...CONTEXT, unusual: UNUSUAL })],
    ['a lasting rise', toRiseReading(RISE)],
  ])('give %s the signal format accepts', (_label, reading) => {
    expect(
      wrapReading({
        reading,
        strategyId: 'known_failures',
        strategyVersion: 1,
        spaceId: 'default',
        scheduledMinute: Date.UTC(2026, 10, 20, 10, 35),
      })
    ).toMatchObject({ dropped: false });
  });
});
