/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { RuleRow } from '../../rules/managed_rule_reader';
import { getSeriesKey } from '../series_key';
import type { DetectionSignalReading, GeneratorContext } from '../types';
import { getKnownFailureRuleId } from './known_failure_rule';
import { KnownFailuresGenerator } from './known_failures_generator';

const MINUTE_MS = 60_000;
const WINDOW = { from: Date.UTC(2026, 10, 20, 10, 0), to: Date.UTC(2026, 10, 20, 10, 5) };
const SERIES_KEY = getSeriesKey({ fingerprint: 'known_failures:watched', source_id: 'source-1' });

const createQuery = (id: string, esql: string): QueryLink => ({
  query: {
    id,
    title: id,
    description: id,
    esql: { query: esql },
    type: 'match',
    features: [{ id: 'checkout' }],
  },
  source_id: 'source-1',
  rule_backed: false,
  rule_id: `rule-${id}`,
});

const WATCHED = createQuery('watched', 'FROM logs | WHERE message : "timeout"');
const RULE_ID = getKnownFailureRuleId({ spaceId: 'default', query: WATCHED, cpsEnabled: false });

/** A run of the watched rule whose seven newest minutes, from `firstMinute` past the window start, hold `counts`. */
const createRow = (
  firstMinute: number,
  counts: number[],
  change: Record<string, unknown> = {}
): RuleRow => ({
  rule_id: RULE_ID,
  scheduled_timestamp: WINDOW.from + (firstMinute + counts.length + 1) * MINUTE_MS,
  data: {
    newest_counts: counts.map(
      (count, index) =>
        `${new Date(WINDOW.from + (firstMinute + index) * MINUTE_MS).toISOString()}=${count}`
    ),
    baseline_median: 2,
    baseline_mad: 1,
    baseline_mean: 2,
    baseline_std_dev: 0.8,
    ...change,
  },
});

const createContext = ({
  rows,
  history = [],
}: {
  rows: RuleRow[];
  history?: DetectionSignalReading[];
}): GeneratorContext =>
  ({
    spaceId: 'default',
    window: WINDOW,
    sources: [{ id: 'source-1', enabled: true }],
    cpsEnabled: false,
    abortSignal: new AbortController().signal,
    knowledge: {
      listQueries: async () => [WATCHED],
      listFeatures: async () => [
        {
          id: 'checkout',
          source_id: 'source-1',
          type: 'entity',
          subtype: 'service',
          properties: { name: 'checkout-service' },
        },
      ],
    },
    rules: {
      listManaged: async () => [{ id: RULE_ID, enabled: true }],
      readRows: async () => rows,
    },
    history: { readHistory: async () => new Map([[SERIES_KEY, history]]) },
  } as unknown as GeneratorContext);

describe('KnownFailuresGenerator', () => {
  // A wrong id reads another indicator's rows, or none.
  it('reads the window of the enabled rules that watch a current knowledge indicator', async () => {
    const offRule = createQuery('off', 'FROM logs | WHERE message : "refused"');
    const getId = (query: QueryLink) =>
      getKnownFailureRuleId({ spaceId: 'default', query, cpsEnabled: false });
    const readRows = jest.fn().mockResolvedValue([]);

    const result = await new KnownFailuresGenerator().generate({
      ...createContext({ rows: [] }),
      knowledge: { listQueries: async () => [WATCHED, offRule] },
      rules: {
        listManaged: async () => [
          { id: getId(WATCHED), enabled: true },
          { id: getId(offRule), enabled: false },
          // The rule of a knowledge indicator deleted since: nothing to describe its rows.
          { id: 'orphan', enabled: true },
        ],
        readRows,
      },
    } as unknown as GeneratorContext);

    expect(readRows).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', ruleIds: [getId(WATCHED)], ...WINDOW })
    );
    // A rule that wrote nothing did not run: silence must not read as a quiet indicator.
    expect(result).toEqual({
      readings: [],
      notes: [expect.stringMatching(/wrote no row in the window/)],
      truncated: false,
    });
  });

  it('reports a spike and a lasting rise once each, about the service the indicator watches', async () => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [
          // Newest first, as the reader sorts them; the two runs share minutes 3 and 4.
          createRow(3, [2, 40, 2, 2, 2, 2, 2], {
            change_at: WINDOW.from - 60 * MINUTE_MS,
            change_type: 'step_change',
            change_pvalue: 1e-20,
            before_change_median: 5,
            before_change_minutes: 300,
            after_change_median: 10,
            recent_median: 10,
          }),
          createRow(-2, [2, 2, 2, 2, 2, 2, 2]),
        ],
      })
    );

    expect(result.readings).toEqual([
      expect.objectContaining({
        fingerprint: 'known_failures:watched',
        rule_id: RULE_ID,
        entity: { type: 'service', name: 'checkout-service' },
        bucket_start: WINDOW.from + 4 * MINUTE_MS,
        value: 40,
        details: expect.objectContaining({ check: 'unusual_minute' }),
      }),
      expect.objectContaining({
        value: 10,
        details: expect.objectContaining({ check: 'lasting_rise', rise: 5 }),
      }),
    ]);
    expect(result.notes).toEqual([]);
  });

  // An edited query gets a new rule; the old rule's threshold describes another condition.
  it('ignores the event an edited indicator’s old rule left open', async () => {
    const minute = 9;
    const oldRuleReading = {
      status: 'breached',
      rule_id: 'old-rule',
      bucket_start: WINDOW.from,
      details: { check: 'unusual_minute', threshold: 3 },
    } as unknown as DetectionSignalReading;
    const rows = [createRow(0, [2, 2, minute, 2, 2, 2, 2])];

    const withOldRule = await new KnownFailuresGenerator().generate(
      createContext({ rows, history: [oldRuleReading] })
    );
    const withSameRule = await new KnownFailuresGenerator().generate(
      createContext({ rows, history: [{ ...oldRuleReading, rule_id: RULE_ID }] })
    );

    expect(withOldRule.readings).toEqual([]);
    expect(withSameRule.readings).toEqual([expect.objectContaining({ value: minute })]);
  });

  it('notes a row without the Known failures columns and judges the others', async () => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [
          createRow(0, [2, 2, 40, 2, 2, 2, 2]),
          { rule_id: RULE_ID, scheduled_timestamp: WINDOW.from, data: { recent_max: 26 } },
        ],
      })
    );

    expect(result.readings).toEqual([expect.objectContaining({ value: 40 })]);
    expect(result.notes).toEqual([expect.stringMatching(/without the Known failures columns/)]);
  });
});
