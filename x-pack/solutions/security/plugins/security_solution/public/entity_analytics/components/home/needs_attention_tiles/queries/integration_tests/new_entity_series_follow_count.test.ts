/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from '../../../entities_grid/common';
import { buildNewEntityCountQuery } from '../new_entity_query';
import { buildNewEntitySeriesQuery, newEntitySeriesColumn } from '../new_entity_series_query';
import { getSeriesWindow, readSeriesDots } from '../tile_series_window';

/*
 * The New entity sparkline dots must follow the tile count. Dot k is the count query with its
 * first_seen window moved back k steps, so this test runs the real count query once per dot.
 * Entities sit half an hour off a whole hour, so none is on the edge of a bucket.
 *
 * | entity.id | first_seen (hours ago) | risk score | notes                                      |
 * |-----------|------------------------|------------|--------------------------------------------|
 * | host:n1   | 0.5                    | 5          |                                            |
 * | host:n2   | 5.5                    | 5          |                                            |
 * | host:n3   | 5.5                    | 0          | dropped: risk score is not above 0         |
 * | host:n4   | 30.5                   | 5          |                                            |
 * | host:n5   | 100.5                  | 5          |                                            |
 * | host:n6   | 400.5                  | 5          |                                            |
 * | host:n7   | 1200.5                 | 5          | older than the 30d window                  |
 * | host:gold | 2000                   | 5          | old itself                                 |
 * | host:a1   | 3.5                    | 5          | alias of host:gold: counts as host:gold    |
 * | host:a2   | 4.5                    | 5          | second alias of host:gold: still one entity |
 */

const ENTITY_INDEX = 'entities-latest-new-entity-series-test';
const HOUR_MS = 60 * 60 * 1000;
const RANGES: readonly TimeRange[] = ['24h', '7d', '30d'];
const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const ENTITIES: ReadonlyArray<{
  id: string;
  hoursAgo: number;
  score: number;
  resolvedTo?: string;
}> = [
  { id: 'host:n1', hoursAgo: 0.5, score: 5 },
  { id: 'host:n2', hoursAgo: 5.5, score: 5 },
  { id: 'host:n3', hoursAgo: 5.5, score: 0 },
  { id: 'host:n4', hoursAgo: 30.5, score: 5 },
  { id: 'host:n5', hoursAgo: 100.5, score: 5 },
  { id: 'host:n6', hoursAgo: 400.5, score: 5 },
  { id: 'host:n7', hoursAgo: 1200.5, score: 5 },
  { id: 'host:gold', hoursAgo: 2000, score: 5 },
  { id: 'host:a1', hoursAgo: 3.5, score: 5, resolvedTo: 'host:gold' },
  { id: 'host:a2', hoursAgo: 4.5, score: 5, resolvedTo: 'host:gold' },
];

describe('New entity tile series on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await client.indices.create({
      index: ENTITY_INDEX,
      settings: { index: { mode: 'lookup' } },
      mappings: {
        properties: {
          'entity.id': KEYWORD,
          'entity.name': KEYWORD,
          'entity.risk.calculated_score': { type: 'double' },
          'entity.lifecycle.first_seen': DATE,
          'entity.relationships.resolution.resolved_to': KEYWORD,
        },
      },
    });
    const now = Date.now();
    const response = await client.bulk({
      operations: ENTITIES.flatMap(({ id, hoursAgo, score, resolvedTo }) => [
        { index: { _index: ENTITY_INDEX } },
        {
          'entity.id': id,
          'entity.name': id.split(':')[1],
          'entity.risk.calculated_score': score,
          'entity.lifecycle.first_seen': new Date(now - hoursAgo * HOUR_MS).toISOString(),
          ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
        },
      ]),
      refresh: 'wait_for',
    });
    if (response.errors) throw new Error('Bulk indexing of the New entity series fixture failed');
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const query = async (esql: string) =>
    (await client.esql.query({ query: esql })) as unknown as ESQLSearchResponse;

  const countValue = async (esql: string) => {
    const { columns, values } = await query(esql);
    return Number(values[0]?.[columns.findIndex((c) => c.name === 'value')] ?? 0);
  };

  /** The real count query with its first_seen window moved back `k` steps of the range. */
  const countShiftedBack = async (range: TimeRange, k: number) => {
    const { stepHours, dots } = getSeriesWindow(range);
    const base = buildNewEntityCountQuery(ENTITY_INDEX, range);
    const window = /entity\.lifecycle\.first_seen >= NOW\(\) - \d+ (days|hours)/;
    expect(base).toMatch(window);
    return countValue(
      base.replace(
        window,
        `entity.lifecycle.first_seen >= NOW() - ${
          (dots + k) * stepHours
        }h AND entity.lifecycle.first_seen < NOW() - ${k * stepHours}h`
      )
    );
  };

  const series = async (range: TimeRange) =>
    readSeriesDots(
      await query(buildNewEntitySeriesQuery(ENTITY_INDEX, range)),
      range,
      newEntitySeriesColumn
    );

  it.each(RANGES)('every %s dot equals the count query moved back by its steps', async (range) => {
    const { dots } = getSeriesWindow(range);
    const got = await series(range);
    const expected: number[] = [];
    for (let k = dots - 1; k >= 0; k--) expected.push(await countShiftedBack(range, k));
    expect(got).toEqual(expected);
    expect(new Set(expected).size).toBeGreaterThan(1);
  });

  it.each(RANGES)('the newest %s dot is the tile count', async (range) => {
    const got = await series(range);
    expect(got[got.length - 1]).toBe(
      await countValue(buildNewEntityCountQuery(ENTITY_INDEX, range))
    );
  });

  it('counts by hand: risk score above 0, aliases of one entity once', async () => {
    // 24h: n1, n2, and host:gold through its two aliases (n3 has score 0, n4 is 30.5h old).
    expect((await series('24h')).slice(-1)).toEqual([3]);
    // 30d: n1, n2, n4, n5, n6 and host:gold. Not n7 (50 days old).
    expect((await series('30d')).slice(-1)).toEqual([6]);
  });
});
