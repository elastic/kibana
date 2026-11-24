/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { compileKnownFailureQuery } from '../compile_known_failure_query';

const MINUTE_MS = 60_000;
/** Minutes of history seeded before now; more than the window, so the window starts full. */
const SEEDED_MINUTES = 400;
/** Minutes seeded after now, so a minute that closes while the test runs does not read as a dip. */
const FUTURE_MINUTES = 15;
const BASE = 'base';
const HIGH = 'high';

type Level = typeof BASE | typeof HIGH | number;

/**
 * Per-minute shape of each scenario, by how many minutes ago the minute starts: 1 is the last
 * closed minute, left out by the end margin, so 2 is the newest minute the rule counts. `base` is
 * about 2 matches a minute, `high` about 25.
 */
const SCENARIOS: Record<string, (minutesAgo: number) => Level> = {
  quiet: () => 0,
  spike: (minutesAgo) => (minutesAgo === 3 ? 80 : BASE),
  step_up: (minutesAgo) => (minutesAgo <= 20 ? HIGH : BASE),
  // A one-minute spike after a step up, so the spike is the newest change `CHANGE_POINT` marks.
  step_then_spike: (minutesAgo) => {
    if (minutesAgo === 6) {
      return 80;
    }
    return minutesAgo <= 60 ? HIGH : BASE;
  },
};

/** A deterministic wobble of one around the level, so medians are stable and the series is not flat. */
const toCount = ({ level, minutesAgo }: { level: Level; minutesAgo: number }): number => {
  const wobble = (((minutesAgo % 3) + 3) % 3) - 1;
  if (level === BASE) {
    return 2 + wobble;
  }
  if (level === HIGH) {
    return 25 + wobble;
  }
  return level;
};

const getIndex = (scenario: string) => `known-failures-${scenario.replace(/_/g, '-')}`;

async function seedScenario({
  esClient,
  scenario,
  shape,
  nowMinute,
}: {
  esClient: ElasticsearchClient;
  scenario: string;
  shape: (minutesAgo: number) => Level;
  nowMinute: number;
}): Promise<void> {
  const index = getIndex(scenario);
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        message: { type: 'text' },
        'log.level': { type: 'keyword' },
      },
    },
  });

  const documents = Array.from({ length: SEEDED_MINUTES + FUTURE_MINUTES + 1 }, (_, offset) => {
    const minutesAgo = SEEDED_MINUTES - offset;
    const minuteStart = nowMinute - minutesAgo * MINUTE_MS;
    const count = toCount({ level: shape(minutesAgo), minutesAgo });
    const matches = Array.from({ length: count }, (__, position) => ({
      '@timestamp': new Date(minuteStart + Math.floor(((position + 0.5) / count) * MINUTE_MS)),
      message: `upstream request timeout after 30s (${position})`,
      'log.level': 'error',
    }));
    // Matches the text but not the level, so it proves the knowledge indicator's filter applies.
    const noise = {
      '@timestamp': new Date(minuteStart),
      message: 'timeout set',
      'log.level': 'info',
    };
    return [...matches, noise];
  }).flat();

  await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap((document) => [{ index: { _index: index } }, document]),
  });
}

const runCompiledQuery = async (esClient: ElasticsearchClient, scenario: string) => {
  const query = compileKnownFailureQuery({
    knowledgeIndicatorId: 'checkout-timeouts',
    esql: `FROM ${getIndex(scenario)} | WHERE log.level == "error" AND message : "timeout"`,
    cpsEnabled: false,
  });
  const { columns, values } = await esClient.esql.query({ query });

  return values.map((row) =>
    Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]))
  );
};

/** The counts of `newest_minute_counts`, in the order the rule returned them. */
const getCounts = (newestMinuteCounts: unknown): number[] =>
  ([newestMinuteCounts].flat() as string[]).map((minute) => Number(minute.split('=')[1]));

// The rule's query is the measurement every Known failures signal is judged on: a wrong count, a
// normal level read over the wrong minutes or a missing row misjudges every indicator. This runs it
// against real Elasticsearch. The assertions hold if a minute boundary passes while the test runs.
describe('compileKnownFailureQuery against Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
      // CHANGE_POINT needs a platinum license; the trial includes it.
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient();

    const nowMinute = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
    await Promise.all(
      Object.entries(SCENARIOS).map(([scenario, shape]) =>
        seedScenario({ esClient, scenario, shape, nowMinute })
      )
    );
  });

  afterAll(async () => {
    // Teardown only: a failure to stop must not hide the test result.
    await esServer?.stop().catch(() => {});
  });

  it('returns one row of zeros for a knowledge indicator that never matches', async () => {
    const rows = await runCompiledQuery(esClient, 'quiet');

    expect(rows).toHaveLength(1);
    expect(getCounts(rows[0].newest_minute_counts)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(rows[0]).toEqual(
      expect.objectContaining({ baseline_median: 0, change_point_at: null, earlier_median: 0 })
    );
  });

  it('returns a spike among the newest counts, measured against the hour before them', async () => {
    const [row] = await runCompiledQuery(esClient, 'spike');

    const newest = [row.newest_minute_counts].flat() as string[];
    expect(getCounts(newest)).toContain(80);
    // Oldest first, so the row reads in time order.
    expect(newest).toEqual([...newest].sort());
    expect(row).toEqual(
      expect.objectContaining({
        // The wobble of one around 2, over every minute of the hour, empty or not.
        baseline_median: 2,
        baseline_mad: 1,
        // A spike is the baseline check's to judge, not a change of level.
        change_point_at: null,
      })
    );
  });

  it('returns the latest change point with the levels before and after it', async () => {
    const [row] = await runCompiledQuery(esClient, 'step_up');

    expect(row).toEqual(
      expect.objectContaining({
        change_point_type: 'step_change',
        change_point_median_before: 2,
        change_point_median_after: 25,
        recent_median: 25,
        earlier_median: 2,
      })
    );
    expect(row.change_point_minutes_before).toBeGreaterThan(300);
  });

  it('keeps reporting a step up after a later one-minute spike', async () => {
    const [row] = await runCompiledQuery(esClient, 'step_then_spike');

    expect(row).toEqual(
      expect.objectContaining({
        change_point_type: 'step_change',
        change_point_median_before: 2,
        change_point_median_after: 25,
      })
    );
  });
});
