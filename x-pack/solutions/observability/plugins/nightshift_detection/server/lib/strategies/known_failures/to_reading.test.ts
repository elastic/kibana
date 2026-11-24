/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { wrapReading } from '../../signals/wrap_reading';
import { toLastingRiseReading, toUnusualMinuteReading } from './to_reading';

const KNOWLEDGE_INDICATOR: QueryLink = {
  query: {
    id: 'ki-timeouts',
    title: 'Checkout timeouts',
    description: 'Checkout calls time out',
    esql: { query: 'FROM logs | WHERE message : "timeout"' },
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
  cpsEnabled: false,
};
const BASELINE = { median: 2, mad: 1, mean: 2, std_dev: 0.8 };
const UNUSUAL = {
  minute: Date.UTC(2026, 10, 20, 10, 27),
  count: 40,
  threshold: 8,
  baseline: BASELINE,
};
const CHANGE = {
  at: Date.UTC(2026, 10, 20, 9, 50),
  type: 'step_change',
  pvalue: 1e-20,
  before_median: 5,
  before_minutes: 300,
  after_median: 10,
  recent_median: 11,
};
const RISE = { ...CONTEXT, change: CHANGE, rise: 5, lastMinute: Date.UTC(2026, 10, 20, 10, 30) };

describe('toUnusualMinuteReading', () => {
  it('reports the minute with the threshold it was judged against', () => {
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
      evidence_esql:
        'FROM logs | WHERE message : "timeout"\n| WHERE @timestamp >= "2026-11-20T10:27:00.000Z" AND @timestamp < "2026-11-20T10:28:00.000Z"',
      role: 'primary',
      compare_with_normal: false,
      quiet_period_minutes: 10,
      details: {
        check: 'unusual_minute',
        threshold: 8,
        baseline: BASELINE,
        ki_id: 'ki-timeouts',
        linked_feature_ids: ['checkout'],
      },
    });
  });

  // The event keeps its identity when the query, and so the rule and its id, change.
  it('keeps the fingerprint when the knowledge indicator query changes', () => {
    const edited = toUnusualMinuteReading({
      ...CONTEXT,
      ruleId: 'rule-2',
      knowledgeIndicator: {
        ...KNOWLEDGE_INDICATOR,
        query: { ...KNOWLEDGE_INDICATOR.query, esql: { query: 'FROM logs | WHERE a == 1' } },
      },
      unusual: UNUSUAL,
    });

    expect(edited.fingerprint).toBe('known_failures:ki-timeouts');
  });

  it('routes the evidence query across projects when cross-project search is on', () => {
    expect(
      toUnusualMinuteReading({ ...CONTEXT, cpsEnabled: true, unusual: UNUSUAL }).evidence_esql
    ).toMatch(/^SET project_routing=".+";\nFROM logs/);
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

describe('toLastingRiseReading', () => {
  it('reports the recent minutes that show the rise holds, with evidence from the change', () => {
    expect(toLastingRiseReading(RISE)).toEqual(
      expect.objectContaining({
        bucket_start: Date.UTC(2026, 10, 20, 10, 16),
        bucket_end: Date.UTC(2026, 10, 20, 10, 31),
        value: 11,
        evidence_esql: expect.stringContaining(
          '@timestamp >= "2026-11-20T09:50:00.000Z" AND @timestamp < "2026-11-20T10:31:00.000Z"'
        ),
        details: expect.objectContaining({
          check: 'lasting_rise',
          change_type: 'step_change',
          change_at: '2026-11-20T09:50:00.000Z',
          before_change_median: 5,
          after_change_median: 10,
          rise: 5,
        }),
      })
    );
  });
});

// The engine drops a reading the signal format rejects, so a mismatch would store nothing.
describe('Known failures readings', () => {
  it.each([
    ['an unusual minute', toUnusualMinuteReading({ ...CONTEXT, unusual: UNUSUAL })],
    ['a lasting rise', toLastingRiseReading(RISE)],
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
