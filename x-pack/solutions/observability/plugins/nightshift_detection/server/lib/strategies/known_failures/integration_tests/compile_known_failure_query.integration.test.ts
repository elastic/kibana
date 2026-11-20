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
import { KNOWN_FAILURES_SETTINGS } from '../constants';

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
 * closed minute. `base` is about 2 matches a minute, `high` about 25.
 */
const SCENARIOS: Record<string, (minutesAgo: number) => Level> = {
  spike: (minutesAgo) => (minutesAgo === 2 ? 80 : BASE),
  step_up: (minutesAgo) => (minutesAgo <= 40 ? HIGH : BASE),
  recovered: (minutesAgo) => (minutesAgo >= 16 && minutesAgo <= 60 ? HIGH : BASE),
  step_down_after_up: (minutesAgo) => (minutesAgo >= 61 && minutesAgo <= 120 ? HIGH : BASE),
  quiet: () => 0,
  flat_high: () => HIGH,
};

/** A deterministic wobble of one around the level, so medians are stable and the series is not flat. */
const toCount = (level: Level, minutesAgo: number): number => {
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
    const count = toCount(shape(minutesAgo), minutesAgo);
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
    esql: `FROM ${getIndex(scenario)} | WHERE log.level == "error" AND message : "timeout"`,
    cpsEnabled: false,
  });
  const { columns, values } = await esClient.esql.query({ query });

  return values.map((row) =>
    Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]))
  );
};

// The rule's query is the detection: if it returns a row for a series that is not up, or none for
// one that is, every Known failures signal is wrong. This runs it against real Elasticsearch.
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

  it('reports a spike with its own minute as the level', async () => {
    const rows = await runCompiledQuery(esClient, 'spike');

    expect(rows).toEqual([
      expect.objectContaining({
        change_type: 'spike',
        reference: 2,
        level_at_change: 80,
        recovery_threshold: 41,
        recent_max: 80,
        minute_count: KNOWN_FAILURES_SETTINGS.window_minutes,
      }),
    ]);
  });

  it('reports a sustained step up with the level after it', async () => {
    const rows = await runCompiledQuery(esClient, 'step_up');

    expect(rows).toEqual([
      expect.objectContaining({
        change_type: 'step_change',
        reference: 2,
        level_at_change: 25,
        recovery_threshold: 13.5,
      }),
    ]);
  });

  it.each([
    ['recovered', 'a step up whose last five minutes are back to normal'],
    ['step_down_after_up', 'a step down after a step up'],
    ['quiet', 'a knowledge indicator that never matches'],
    ['flat_high', 'a level that is high but never changed'],
  ])('returns nothing for %s: %s', async (scenario) => {
    await expect(runCompiledQuery(esClient, scenario)).resolves.toEqual([]);
  });
});
