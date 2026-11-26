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

const createQuery = (
  id: string,
  esql: string,
  { severityScore = 70, isRuleBacked = false } = {}
): QueryLink => ({
  query: {
    id,
    title: id,
    description: id,
    esql: { query: esql },
    type: 'match',
    features: [{ id: 'checkout' }],
    severity_score: severityScore,
  },
  source_id: 'source-1',
  rule_backed: isRuleBacked,
  rule_id: `rule-${id}`,
});

const WATCHED = createQuery('watched', 'FROM logs | WHERE message : "timeout"');
const CREATED_AT = new Date(WINDOW.from - 60 * MINUTE_MS).toISOString();
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
    newest_minute_counts: counts.map(
      (count, index) =>
        `${new Date(WINDOW.from + (firstMinute + index) * MINUTE_MS).toISOString()}=${count}`
    ),
    baseline_median: 2,
    baseline_mad: 1,
    baseline_mean: 2,
    baseline_std_dev: 0.8,
    recent_median: 2,
    earlier_median: 2,
    ...change,
  },
});

/** The source's data has begun long before the window unless a test says otherwise. */
const LONG_AGO = new Date(WINDOW.from - 24 * 60 * MINUTE_MS).toISOString();

const createContext = ({
  rows,
  history = [],
  readDataStart = async () => ({ values: [[LONG_AGO]] }),
}: {
  rows: RuleRow[];
  history?: DetectionSignalReading[];
  /** Answers the query for the first line of the indicator's index. */
  readDataStart?: () => Promise<{ values: unknown[][] }>;
}): GeneratorContext =>
  ({
    spaceId: 'default',
    window: WINDOW,
    sources: [{ id: 'source-1', title: 'Checkout logs', enabled: true }],
    cpsEnabled: false,
    abortSignal: new AbortController().signal,
    esClient: { esql: { query: readDataStart } },
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
      listManaged: async () => [{ id: RULE_ID, enabled: true, created_at: CREATED_AT }],
      readRows: async () => rows,
    },
    // Filtered by time like the store, so a test sees what a too-narrow lookback would miss.
    history: {
      readHistory: async ({ from, to }: { from: number; to: number }) =>
        new Map([
          [
            SERIES_KEY,
            history.filter(
              ({ bucket_start: bucketStart }) => bucketStart >= from && bucketStart < to
            ),
          ],
        ]),
    },
  } as unknown as GeneratorContext);

describe('KnownFailuresGenerator', () => {
  // A wrong id reads another indicator's rows, or none.
  it('reads the window of the enabled rules that watch a current knowledge indicator', async () => {
    const offRule = createQuery('off', 'FROM logs | WHERE message : "refused"');
    // Scored down since the last reconcile: its rule is still on until the next one deletes it.
    const downgraded = createQuery('downgraded', 'FROM logs | WHERE message : "reset"', {
      severityScore: 40,
    });
    // Promoted by hand in significant events, whatever its score.
    const promoted = createQuery('promoted', 'FROM logs | WHERE message : "denied"', {
      severityScore: 40,
      isRuleBacked: true,
    });
    const getId = (query: QueryLink) =>
      getKnownFailureRuleId({ spaceId: 'default', query, cpsEnabled: false });
    const readRows = jest.fn().mockResolvedValue([]);

    const result = await new KnownFailuresGenerator().generate({
      ...createContext({ rows: [] }),
      knowledge: { listQueries: async () => [WATCHED, offRule, downgraded, promoted] },
      rules: {
        listManaged: async () => [
          { id: getId(WATCHED), enabled: true, created_at: CREATED_AT },
          { id: getId(offRule), enabled: false, created_at: CREATED_AT },
          { id: getId(downgraded), enabled: true, created_at: CREATED_AT },
          { id: getId(promoted), enabled: true, created_at: CREATED_AT },
          // The rule of a knowledge indicator deleted since: nothing to describe its rows.
          { id: 'orphan', enabled: true, created_at: CREATED_AT },
        ],
        readRows,
      },
    } as unknown as GeneratorContext);

    expect(readRows).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        ruleIds: [getId(WATCHED), getId(promoted)],
        ...WINDOW,
      })
    );
    // A rule that wrote nothing did not run, and a disabled rule watches nothing: silence must not
    // read as a quiet indicator.
    expect(result).toEqual({
      readings: [],
      notes: [
        expect.stringMatching(/\[off\] has a disabled Known failures rule/),
        expect.stringMatching(/of knowledge indicator \[watched\] wrote no row in the window/),
        expect.stringMatching(/of knowledge indicator \[promoted\] wrote no row in the window/),
      ],
      truncated: false,
    });
  });

  // The rule may have failed to be created, as it did live for lack of an API key grant.
  it('notes a countable knowledge indicator that has no rule', async () => {
    const result = await new KnownFailuresGenerator().generate({
      ...createContext({ rows: [] }),
      rules: { listManaged: async () => [], readRows: async () => [] },
    } as unknown as GeneratorContext);

    expect(result.notes).toEqual([
      expect.stringMatching(/\[watched\] has no Known failures rule, so it is not watched/),
    ]);
  });

  it('reports a spike and a lasting rise once each, about the service the indicator watches', async () => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [
          // Newest first, as the reader sorts them; the two runs share minutes 3 and 4.
          createRow(3, [2, 40, 2, 2, 2, 2, 2], {
            change_point_at: WINDOW.from - 60 * MINUTE_MS,
            change_point_type: 'step_change',
            change_point_pvalue: 1e-20,
            change_point_median_before: 5,
            change_point_minutes_before: 300,
            change_point_median_after: 10,
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
        details: expect.objectContaining({
          check: 'lasting_rise',
          rise: 5,
          source_title: 'Checkout logs',
        }),
      }),
    ]);
    expect(result.notes).toEqual([]);
  });

  // Minutes before the source's data count as zero matches: its first data would read as a failure.
  it('reports nothing measured against minutes from before the source’s data', async () => {
    const readDataStart = jest
      .fn()
      .mockResolvedValue({ values: [[new Date(WINDOW.from - 30 * MINUTE_MS).toISOString()]] });

    const result = await new KnownFailuresGenerator().generate(
      createContext({ rows: [createRow(0, [2, 2, 40, 2, 2, 2, 2])], readDataStart })
    );

    expect(result.readings).toEqual([]);
    // An hour before the run's six-hour window, which ends after its newest minute: a sparse index
    // with no line in the window's first minute still had data when the window began.
    const lookupFrom = new Date(WINDOW.from + (7 - 360 - 60) * MINUTE_MS).toISOString();
    expect(readDataStart).toHaveBeenCalledWith(
      {
        query: `FROM logs\n| WHERE @timestamp >= "${lookupFrom}"\n| SORT @timestamp\n| LIMIT 1\n| KEEP @timestamp`,
      },
      expect.anything()
    );
  });

  // Fail open: a missed failure costs more than a source warming up reported once.
  it('reports what it found, with a note, when it cannot tell when the source’s data begins', async () => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [createRow(0, [2, 2, 40, 2, 2, 2, 2])],
        readDataStart: async () => {
          throw new Error('index_not_found_exception');
        },
      })
    );

    expect(result.readings).toEqual([expect.objectContaining({ value: 40 })]);
    expect(result.notes).toEqual([expect.stringMatching(/could not tell when the data .* begins/)]);
  });

  it('reports what it found, with a note, when the data start lookup finds no data', async () => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [createRow(0, [2, 2, 40, 2, 2, 2, 2])],
        readDataStart: async () => ({ values: [] }),
      })
    );

    expect(result.readings).toEqual([expect.objectContaining({ value: 40 })]);
    expect(result.notes).toEqual([expect.stringMatching(/found no data/)]);
  });

  // Live, one reported spike of 48 against a normal of 2 hid a burst of 11 for the hour after it.
  // The run is the oldest a window can hold: its query read NOW() two minutes before the window,
  // so its hour starts 70 minutes back, and the spike sits on that hour's first minute, as far back
  // as the history read must go.
  it('leaves a spike the same rule reported out of the normal level of the hour after it', async () => {
    const mean = (59 * 2 + 48) / 60;
    const row = createRow(-10, [2, 2, 2, 11, 11, 2, 2], {
      baseline_median: 2,
      baseline_mad: 0,
      baseline_mean: mean,
      baseline_std_dev: Math.sqrt((59 * 4 + 48 ** 2) / 60 - mean ** 2),
    });
    const reportedSpike = {
      status: 'breached',
      rule_id: RULE_ID,
      bucket_start: WINDOW.from - 70 * MINUTE_MS,
      value: 48,
      details: { check: 'unusual_minute', threshold: 7 },
    } as unknown as DetectionSignalReading;

    const sameRule = await new KnownFailuresGenerator().generate(
      createContext({ rows: [row], history: [reportedSpike] })
    );
    // An edited query's old rule counted other lines.
    const oldRule = await new KnownFailuresGenerator().generate(
      createContext({ rows: [row], history: [{ ...reportedSpike, rule_id: 'old-rule' }] })
    );

    expect(sameRule.readings).toEqual([
      expect.objectContaining({ value: 11, bucket_start: WINDOW.from - 7 * MINUTE_MS }),
      expect.objectContaining({ value: 11, bucket_start: WINDOW.from - 6 * MINUTE_MS }),
    ]);
    expect(oldRule.readings).toEqual([]);
  });

  it('reads when the source’s data begins only when a check found something', async () => {
    const readDataStart = jest.fn();

    await new KnownFailuresGenerator().generate(
      createContext({ rows: [createRow(0, [2, 2, 2, 2, 2, 2, 2])], readDataStart })
    );

    expect(readDataStart).not.toHaveBeenCalled();
  });

  // A rule reconciled during the window has had no chance to run.
  it('does not note a rule created during the window as not running', async () => {
    const result = await new KnownFailuresGenerator().generate({
      ...createContext({ rows: [] }),
      rules: {
        listManaged: async () => [
          {
            id: RULE_ID,
            enabled: true,
            created_at: new Date(WINDOW.from + MINUTE_MS).toISOString(),
          },
        ],
        readRows: async () => [],
      },
    } as unknown as GeneratorContext);

    expect(result.notes).toEqual([]);
  });

  // The newest minutes of a run start before the window; a minute an earlier tick reported there
  // must be found, whichever check reported it, or it is reported twice.
  it('does not report again a minute an earlier tick reported just before the window', async () => {
    const reportedMinute = WINDOW.from - 4 * MINUTE_MS;
    const earlierReading = {
      status: 'breached',
      rule_id: RULE_ID,
      bucket_start: reportedMinute,
      details: { check: 'lasting_rise', threshold: 3 },
    } as unknown as DetectionSignalReading;

    const result = await new KnownFailuresGenerator().generate(
      createContext({ rows: [createRow(-4, [40, 2, 2, 2, 2, 2, 2])], history: [earlierReading] })
    );

    expect(result.readings).toEqual([]);
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

  // `Number('')` is 0, so an empty count would read as a quiet minute.
  it.each([
    ['without the Known failures columns', { recent_max: 26 }],
    [
      'with an empty count',
      { ...createRow(-5, [2]).data, newest_minute_counts: ['2026-11-20T10:00:00.000Z='] },
    ],
    [
      'with a negative count',
      { ...createRow(-5, [2]).data, newest_minute_counts: ['2026-11-20T10:00:00.000Z=-3'] },
    ],
  ])('notes a row %s and judges the others', async (_label, data) => {
    const result = await new KnownFailuresGenerator().generate(
      createContext({
        rows: [
          createRow(0, [2, 2, 40, 2, 2, 2, 2]),
          { rule_id: RULE_ID, scheduled_timestamp: WINDOW.from, data },
        ],
      })
    );

    expect(result.readings).toEqual([expect.objectContaining({ value: 40 })]);
    expect(result.notes).toEqual([expect.stringMatching(/without the Known failures columns/)]);
  });
});
