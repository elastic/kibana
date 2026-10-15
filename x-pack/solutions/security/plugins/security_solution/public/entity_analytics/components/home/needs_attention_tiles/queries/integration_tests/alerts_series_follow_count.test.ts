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
import { getAlertsIndex } from '../../../entities_grid/queries/esql';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';
import {
  buildAlertBasedTilesSeriesQuery,
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from '../entities_with_alerts_series_query';
import { getSeriesWindow, readSeriesDots } from '../tile_series_window';

/*
 * The sparkline dots must follow the tile count. Dot k is the count query with its alert window
 * moved back k steps, so this test runs the real count query once per dot and compares.
 * Alerts sit half an hour off a whole hour, so no alert is on the edge of a bucket.
 *
 * | entity.id   | watchlisted | alerts (severity, hours ago)                                   |
 * |-------------|-------------|----------------------------------------------------------------|
 * | host:a      |             | high 2.5, high 30.5                                            |
 * | host:alias  |             | critical 5.5 (resolves to host:a: one entity)                  |
 * | host:b      |             | high 100.5                                                     |
 * | user:c      | yes         | low 1.5                                                        |
 * | user:d      | yes         | critical 240.5, low 480.5                                      |
 * | host:e      |             | medium 3.5                                                     |
 * | host:f      |             | critical 1080.5                                                |
 * | host:m      |             | critical 0.5, 7.5, 13.5, 19.5, 25.5 (many buckets of a window) |
 * | host:ghost  | no entity   | high 2.5 (dropped: unknown entity)                             |
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-alerts-series-test';
const HOUR_MS = 60 * 60 * 1000;
const RANGES: readonly TimeRange[] = ['24h', '7d', '30d'];

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const ENTITIES: ReadonlyArray<{ id: string; watchlisted?: boolean; resolvedTo?: string }> = [
  { id: 'host:a' },
  { id: 'host:alias', resolvedTo: 'host:a' },
  { id: 'host:b' },
  { id: 'user:c', watchlisted: true },
  { id: 'user:d', watchlisted: true },
  { id: 'host:e' },
  { id: 'host:f' },
  { id: 'host:m' },
];

const ALERTS: ReadonlyArray<[entityId: string, severity: string, hoursAgo: number]> = [
  ['host:a', 'high', 2.5],
  ['host:a', 'high', 30.5],
  ['host:alias', 'critical', 5.5],
  ['host:b', 'high', 100.5],
  ['user:c', 'low', 1.5],
  ['user:d', 'critical', 240.5],
  ['user:d', 'low', 480.5],
  ['host:e', 'medium', 3.5],
  ['host:f', 'critical', 1080.5],
  ['host:m', 'critical', 0.5],
  ['host:m', 'critical', 7.5],
  ['host:m', 'critical', 13.5],
  ['host:m', 'critical', 19.5],
  ['host:m', 'critical', 25.5],
  ['host:ghost', 'high', 2.5],
];

const isoHoursAgo = (now: number, hours: number) => new Date(now - hours * HOUR_MS).toISOString();

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the alert queries can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.attributes.watchlists': KEYWORD,
        'entity.lifecycle.first_seen': DATE,
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: getAlertsIndex(NAMESPACE),
    mappings: {
      properties: {
        '@timestamp': DATE,
        'kibana.alert.entity.id': KEYWORD,
        'kibana.alert.severity': KEYWORD,
      },
    },
  });
  const operations = [
    ...ENTITIES.flatMap(({ id, watchlisted, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        'entity.lifecycle.first_seen': isoHoursAgo(now, 24 * 100),
        ...(watchlisted ? { 'entity.attributes.watchlists': 'w1' } : {}),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...ALERTS.flatMap(([entityId, severity, hoursAgo]) => [
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': isoHoursAgo(now, hoursAgo),
        'kibana.alert.entity.id': entityId,
        'kibana.alert.severity': severity,
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the alert series fixture failed');
};

describe('alert based tile series on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await loadFixture(client);
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const query = async (esql: string) =>
    (await client.esql.query({ query: esql })) as unknown as ESQLSearchResponse;

  const countRow = async (esql: string) => {
    const { columns, values } = await query(esql);
    return Object.fromEntries(columns.map(({ name }, i) => [name, Number(values[0]?.[i] ?? 0)]));
  };

  /** The real count query with its alert window moved back `k` steps of the range. */
  const countShiftedBack = async (range: TimeRange, k: number) => {
    const { stepHours, dots } = getSeriesWindow(range);
    const base = buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, range);
    const window = /\| WHERE @timestamp >= NOW\(\) - [^\n]+/;
    expect(base).toMatch(window);
    return countRow(
      base.replace(
        window,
        `| WHERE @timestamp >= NOW() - ${(dots + k) * stepHours}h AND @timestamp < NOW() - ${
          k * stepHours
        }h`
      )
    );
  };

  const series = async (range: TimeRange) => {
    const raw = await query(buildAlertBasedTilesSeriesQuery(ENTITY_INDEX, NAMESPACE, range));
    return {
      severe: readSeriesDots(raw, range, severeAlertsSeriesColumn),
      watchlisted: readSeriesDots(raw, range, watchlistedSeriesColumn),
    };
  };

  it.each(RANGES)('every %s dot equals the count query moved back by its steps', async (range) => {
    const { dots } = getSeriesWindow(range);
    const got = await series(range);
    const expectedSevere: number[] = [];
    const expectedWatchlisted: number[] = [];
    for (let k = dots - 1; k >= 0; k--) {
      const row = await countShiftedBack(range, k);
      expectedSevere.push(row.severe_alerts_count);
      expectedWatchlisted.push(row.watchlisted_count);
    }
    expect(got.severe).toEqual(expectedSevere);
    expect(got.watchlisted).toEqual(expectedWatchlisted);
    // The fixture must make the check meaningful: the dots are not all the same.
    expect(new Set(expectedSevere).size).toBeGreaterThan(1);
  });

  it.each(RANGES)('the newest %s dot is the tile count', async (range) => {
    const got = await series(range);
    const current = await countRow(buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, range));
    expect(got.severe[got.severe.length - 1]).toBe(current.severe_alerts_count);
    expect(got.watchlisted[got.watchlisted.length - 1]).toBe(current.watchlisted_count);
  });

  it('counts by hand: high or critical only, aliases collapsed, one entity once per window', async () => {
    const got = await series('24h');
    // The last 24 hours: host:a (2.5h, and host:alias 5.5h), host:m (0.5 to 19.5h). Not host:e (medium)
    // and not host:ghost (unknown entity). Watchlisted: user:c (low alert, any severity counts).
    expect(got.severe[got.severe.length - 1]).toBe(2);
    expect(got.watchlisted[got.watchlisted.length - 1]).toBe(1);
  });

  it('reads the 30d window as 30 days, so older alerts fall out of the newest dot', async () => {
    const got = await series('30d');
    // 30 days back: host:a, host:b, host:m, user:d (critical 10 days ago). host:f is 45 days old.
    expect(got.severe[got.severe.length - 1]).toBe(4);
    expect(got.watchlisted[got.watchlisted.length - 1]).toBe(2);
  });
});
