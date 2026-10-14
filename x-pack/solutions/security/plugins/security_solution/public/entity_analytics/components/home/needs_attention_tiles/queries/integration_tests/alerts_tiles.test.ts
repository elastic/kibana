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
import { getAlertsIndex } from '../../../entities_grid/queries/esql';
import { buildAlertBasedTilesQuery } from '../entities_with_alerts_query';

/*
 * Entities and alerts whose alert tile results are known by construction, for the 7d range:
 * the current period is the last 7 days, the previous one the 7 days before that.
 *
 * | entity.id   | first_seen | watchlisted | alerts (severity, days ago)        | notes                        |
 * |-------------|------------|-------------|------------------------------------|------------------------------|
 * | host:a      | 100d       |             | high 3                             | current severe               |
 * | host:alias  | 100d       |             | high 4                             | resolves to host:a, one entity |
 * | host:b      | 100d       |             | critical 10                        | previous severe              |
 * | user:c      | 100d       |             | high 2, critical 9                 | severe in both periods       |
 * | user:d      | 100d       | yes         | low 1                              | current watchlisted          |
 * | host:e      | 10d        | yes         | medium 11                          | previous watchlisted |
 * | host:f      | 2d         |             | low 1                              | current, low alert       |
 * | host:g      | 100d       |             | critical 5                         | current severe only          |
 * | host:ghost  | no entity doc | -        | high 3                             | dropped: unknown entity      |
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-alerts-tiles-test';
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

interface EntitySeed {
  id: string;
  firstSeenDaysAgo: number;
  watchlisted?: boolean;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:a', firstSeenDaysAgo: 100 },
  { id: 'host:alias', firstSeenDaysAgo: 100, resolvedTo: 'host:a' },
  { id: 'host:b', firstSeenDaysAgo: 100 },
  { id: 'user:c', firstSeenDaysAgo: 100 },
  { id: 'user:d', firstSeenDaysAgo: 100, watchlisted: true },
  { id: 'host:e', firstSeenDaysAgo: 10, watchlisted: true },
  { id: 'host:f', firstSeenDaysAgo: 2 },
  { id: 'host:g', firstSeenDaysAgo: 100 },
];

const ALERTS: ReadonlyArray<[entityId: string, severity: string, daysAgo: number]> = [
  ['host:a', 'high', 3],
  ['host:alias', 'high', 4],
  ['host:b', 'critical', 10],
  ['user:c', 'high', 2],
  ['user:c', 'critical', 9],
  ['user:d', 'low', 1],
  ['host:e', 'medium', 11],
  ['host:f', 'low', 1],
  ['host:g', 'critical', 5],
  ['host:ghost', 'high', 3],
];

const isoDaysAgo = (now: number, days: number) => new Date(now - days * DAY_MS).toISOString();

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the alert query can LOOKUP JOIN it.
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
    ...ENTITIES.flatMap(({ id, firstSeenDaysAgo, watchlisted, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        'entity.lifecycle.first_seen': isoDaysAgo(now, firstSeenDaysAgo),
        ...(watchlisted ? { 'entity.attributes.watchlists': 'w1' } : {}),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...ALERTS.flatMap(([entityId, severity, daysAgo]) => [
      { index: { _index: getAlertsIndex(NAMESPACE) } },
      {
        '@timestamp': isoDaysAgo(now, daysAgo),
        'kibana.alert.entity.id': entityId,
        'kibana.alert.severity': severity,
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the alert tiles fixture failed');
};

const ids = (value: unknown) => [value ?? []].flat().map(String).sort();

describe('alert based tiles on Elasticsearch', () => {
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

  const runTiles = async (period: 'current' | 'previous') => {
    const query = buildAlertBasedTilesQuery(ENTITY_INDEX, NAMESPACE, '7d', [], period);
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return {
      columnNames: columns.map(({ name }) => name).sort(),
      severe: { count: Number(row.severe_alerts_count), ids: ids(row.severe_alerts_entity_ids) },
      watchlisted: { count: Number(row.watchlisted_count), ids: ids(row.watchlisted_entity_ids) },
    };
  };

  it('counts the current period as the last 7 days, with aliases collapsed into one entity', async () => {
    expect(await runTiles('current')).toEqual({
      columnNames: [
        'severe_alerts_count',
        'severe_alerts_entity_ids',
        'watchlisted_count',
        'watchlisted_entity_ids',
      ],
      severe: { count: 3, ids: ['host:a', 'host:g', 'user:c'] },
      watchlisted: { count: 1, ids: ['user:d'] },
    });
  });

  it('counts the previous period as the 7 days before that, by alert time, and only returns the counts', async () => {
    expect(await runTiles('previous')).toEqual({
      columnNames: ['severe_alerts_count', 'watchlisted_count'],
      severe: { count: 2, ids: [] },
      watchlisted: { count: 1, ids: [] },
    });
  });

  it('gives the delta as the current count minus the previous count', async () => {
    const [current, previous] = [await runTiles('current'), await runTiles('previous')];
    // Severe: host:a, host:g and user:c now, host:b and user:c before. Watchlisted is level.
    expect(current.severe.count - previous.severe.count).toBe(1);
    expect(current.watchlisted.count - previous.watchlisted.count).toBe(0);
  });
});
