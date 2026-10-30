/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from '../../../entities_grid/common';
import { getSeriesWindow, readSeriesDots } from '../tile_series_window';

/*
 * The checks every sparkline series query must pass on Elasticsearch, so a series file holds only
 * its fixture and how its count query is moved back in time:
 * - every dot equals the count query as it stood k steps ago,
 * - the newest dot is the tile count,
 * - the newest dot equals a number worked out by hand from the fixture.
 */

export const RANGES: readonly TimeRange[] = ['24h', '7d', '30d'];

export type RunEsql = (esql: string) => Promise<ESQLSearchResponse>;

/** The first row of a response, as a number per column name; a missing value is 0. */
export const readCounts = (
  { columns, values }: ESQLSearchResponse,
  columnNames: readonly string[]
): number[] =>
  columnNames.map((name) => Number(values[0]?.[columns.findIndex((c) => c.name === name)] ?? 0));

/**
 * The count query with its time window moved back `k` steps of the range: the window that ends `k`
 * steps ago and starts `dots` steps before that. `window` must match the window of `base`.
 */
export const moveWindowBack = ({
  base,
  window,
  field,
  prefix = '',
  lowerBoundOnly = false,
  range,
  k,
}: {
  base: string;
  window: RegExp;
  field: string;
  prefix?: string;
  /** Moves only the start of the window, for a filter that reads everything since the start. */
  lowerBoundOnly?: boolean;
  range: TimeRange;
  k: number;
}): string => {
  const { stepHours, dots } = getSeriesWindow(range);
  expect(base).toMatch(window);
  const start = `${prefix}${field} >= NOW() - ${(dots + k) * stepHours}h`;
  return base.replace(
    window,
    lowerBoundOnly ? start : `${start} AND ${field} < NOW() - ${k * stepHours}h`
  );
};

export interface SeriesTile {
  name: string;
  column: (k: number) => string;
  /** The newest dot worked out from the fixture, for the 24h and the 30d range. */
  byHand: { '24h': number; '30d': number };
}

interface SeriesFollowsCountConfig {
  name: string;
  loadFixture: (client: Client) => Promise<void>;
  /** In the order of `tiles`: the series query, which returns the dots of every tile. */
  tiles: readonly SeriesTile[];
  seriesQuery: (range: TimeRange) => string;
  /** The count of each tile now. */
  countNow: (range: TimeRange, run: RunEsql) => Promise<number[]>;
  /** The count of each tile as it stood `k` steps of the range ago. */
  countStepsAgo: (range: TimeRange, k: number, run: RunEsql) => Promise<number[]>;
  setupTimeoutMs?: number;
  /** Checks only this series has, run on the same Elasticsearch. */
  extraTests?: (run: RunEsql) => void;
}

export const describeSeriesFollowsCount = ({
  name,
  loadFixture,
  tiles,
  seriesQuery,
  countNow,
  countStepsAgo,
  setupTimeoutMs = 300_000,
  extraTests,
}: SeriesFollowsCountConfig) => {
  describe(`${name} on Elasticsearch`, () => {
    let esServer: ReturnType<typeof createTestEsCluster>;
    let client: Client;

    beforeAll(async () => {
      esServer = createTestEsCluster({
        log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
      });
      await esServer.start();
      client = esServer.getClient();
      await loadFixture(client);
    }, setupTimeoutMs);

    afterAll(async () => {
      await esServer?.stop();
    });

    const run: RunEsql = async (esql) =>
      (await client.esql.query({ query: esql })) as unknown as ESQLSearchResponse;

    const dotsOfTiles = async (range: TimeRange): Promise<number[][]> => {
      const raw = await run(seriesQuery(range));
      return tiles.map(({ column }) => readSeriesDots(raw, range, column));
    };

    it.each(RANGES)(
      'every %s dot equals the count query moved back by its steps',
      async (range) => {
        const { dots } = getSeriesWindow(range);
        const got = await dotsOfTiles(range);
        const expected: number[][] = tiles.map(() => []);
        for (let k = dots - 1; k >= 0; k--) {
          (await countStepsAgo(range, k, run)).forEach((count, t) => expected[t].push(count));
        }
        tiles.forEach((_, t) => {
          expect(got[t]).toEqual(expected[t]);
          // The fixture must make the check meaningful: the dots are not all the same.
          expect(new Set(expected[t]).size).toBeGreaterThan(1);
        });
      }
    );

    it.each(RANGES)('the newest %s dot is the tile count', async (range) => {
      const got = await dotsOfTiles(range);
      const current = await countNow(range, run);
      tiles.forEach((_, t) => expect(got[t][got[t].length - 1]).toBe(current[t]));
    });

    tiles.forEach(({ name: tileName, byHand }, t) => {
      it.each(['24h', '30d'] as const)(`${tileName}: counts by hand for %s`, async (range) => {
        const got = (await dotsOfTiles(range))[t];
        expect(got[got.length - 1]).toBe(byHand[range]);
      });
    });

    extraTests?.(run);
  });
};
