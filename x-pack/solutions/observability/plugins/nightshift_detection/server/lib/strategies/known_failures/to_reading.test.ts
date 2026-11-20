/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryKnowledgeIndicator } from '@kbn/significant-events-plugin/server';
import { wrapReading } from '../../signals/wrap_reading';
import type { RuleRow } from '../../rules/managed_rule_reader';
import { toReading } from './to_reading';

const KNOWLEDGE_INDICATOR: QueryKnowledgeIndicator = {
  id: 'ki-timeouts',
  source_id: 'source-1',
  source_enabled: true,
  title: 'Checkout timeouts',
  description: 'Checkout calls time out',
  esql: 'FROM logs | WHERE message : "timeout"',
  severity_score: 70,
  query_type: 'match',
  feature_ids: ['checkout'],
};

// A step up at 10:20 still active in the run scheduled at 10:31 that read its clock at 10:32:01,
// so it compared the minutes up to 10:31.
const ROW: RuleRow = {
  rule_id: 'rule-1',
  scheduled_timestamp: Date.UTC(2026, 10, 20, 10, 31, 0),
  data: {
    change_at: Date.UTC(2026, 10, 20, 10, 20),
    change_type: 'step_change',
    change_pvalue: 5.2e-235,
    reference: 2,
    level_at_change: 25,
    recovery_threshold: 13.5,
    recent_max: 26,
    minute_count: 360,
    window_end: Date.UTC(2026, 10, 20, 10, 31),
  },
};

const ENTITY = { type: 'service', name: 'checkout' } as const;

describe('toReading', () => {
  it('reports the row as a breach of the last closed minutes the rule compared', () => {
    expect(
      toReading({
        knowledgeIndicator: KNOWLEDGE_INDICATOR,
        row: ROW,
        entity: ENTITY,
        cpsEnabled: false,
      })
    ).toEqual({
      status: 'breached',
      fingerprint: 'known_failures:ki-timeouts',
      rule_id: 'rule-1',
      source_id: 'source-1',
      entity: ENTITY,
      // The minutes the rule compared, not those its scheduled time would suggest.
      bucket_start: Date.UTC(2026, 10, 20, 10, 26),
      bucket_end: Date.UTC(2026, 10, 20, 10, 31),
      value: 26,
      unit: 'count',
      title: 'Checkout timeouts',
      description: 'Checkout calls time out',
      importance: 70,
      evidence_esql:
        'FROM logs | WHERE message : "timeout"\n| WHERE @timestamp >= "2026-11-20T10:20:00.000Z" AND @timestamp < "2026-11-20T10:31:00.000Z"',
      role: 'primary',
      compare_with_normal: false,
      quiet_period_minutes: 5,
      details: {
        change_point_type: 'step_change',
        p_value: 5.2e-235,
        change_at: '2026-11-20T10:20:00.000Z',
        reference: 2,
        level_at_change: 25,
        recovery_threshold: 13.5,
        ki_id: 'ki-timeouts',
        linked_feature_ids: ['checkout'],
      },
    });
  });

  // The event keeps its identity when the query, and so the rule and its id, change.
  it('keeps the fingerprint when the knowledge indicator query changes', () => {
    const before = toReading({
      knowledgeIndicator: KNOWLEDGE_INDICATOR,
      row: ROW,
      entity: ENTITY,
      cpsEnabled: false,
    });
    const after = toReading({
      knowledgeIndicator: {
        ...KNOWLEDGE_INDICATOR,
        esql: 'FROM logs | WHERE message : "timed out"',
      },
      row: { ...ROW, rule_id: 'rule-2' },
      entity: ENTITY,
      cpsEnabled: false,
    });

    expect(after?.fingerprint).toBe(before?.fingerprint);
  });

  it('routes the evidence query across projects when cross-project search is on', () => {
    const reading = toReading({
      knowledgeIndicator: KNOWLEDGE_INDICATOR,
      row: ROW,
      entity: ENTITY,
      cpsEnabled: true,
    });

    expect(reading?.evidence_esql).toMatch(/^SET project_routing=".+";\nFROM logs/);
  });

  // The engine drops a reading the signal format rejects, so a mismatch would store nothing.
  it('gives a reading the signal format accepts', () => {
    const reading = toReading({
      knowledgeIndicator: KNOWLEDGE_INDICATOR,
      row: ROW,
      entity: ENTITY,
      cpsEnabled: false,
    });

    expect(
      wrapReading({
        reading: reading!,
        strategyId: 'known_failures',
        strategyVersion: 1,
        spaceId: 'default',
        scheduledMinute: Date.UTC(2026, 10, 20, 10, 35),
      })
    ).toMatchObject({ dropped: false });
  });

  it('gives nothing for a row without the columns the rule query keeps', () => {
    expect(
      toReading({
        knowledgeIndicator: KNOWLEDGE_INDICATOR,
        row: { ...ROW, data: { change_at: '2026-11-20T10:20:00.000Z' } },
        entity: ENTITY,
        cpsEnabled: false,
      })
    ).toBeUndefined();
  });
});
