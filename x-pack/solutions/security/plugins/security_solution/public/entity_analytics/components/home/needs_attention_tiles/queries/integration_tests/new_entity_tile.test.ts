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
import { buildNewEntityCountQuery } from '../new_entity_query';

/*
 * Entities whose New entity tile results are known by construction, for the 7d range: the current
 * period is the last 7 days, the previous one the 7 days before that. An entity counts when it was
 * first seen in the period and its risk score is above 0.
 *
 * | entity.id  | first_seen | score | notes                                               |
 * |------------|------------|-------|-----------------------------------------------------|
 * | host:a     | 3d         | 50    | current                                             |
 * | host:alias | 1d         | 20    | current, resolves to host:a, so one entity with it  |
 * | host:f     | 5d         | 40    | current                                             |
 * | host:b     | 10d        | 30    | previous                                            |
 * | host:e     | 12d        | 10    | previous, resolves to host:b, so one entity with it |
 * | host:c     | 2d         | 0     | dropped: score is 0                                 |
 * | host:g     | 9d         | none  | dropped: no score                                   |
 * | host:d     | 100d       | 80    | dropped: first seen long ago                        |
 */

const ENTITY_INDEX = 'entities-latest-new-entity-tile-test';
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

interface EntitySeed {
  id: string;
  firstSeenDaysAgo: number;
  score?: number;
  resolvedTo?: string;
}

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:a', firstSeenDaysAgo: 3, score: 50 },
  { id: 'host:alias', firstSeenDaysAgo: 1, score: 20, resolvedTo: 'host:a' },
  { id: 'host:f', firstSeenDaysAgo: 5, score: 40 },
  { id: 'host:b', firstSeenDaysAgo: 10, score: 30 },
  { id: 'host:e', firstSeenDaysAgo: 12, score: 10, resolvedTo: 'host:b' },
  { id: 'host:c', firstSeenDaysAgo: 2, score: 0 },
  { id: 'host:g', firstSeenDaysAgo: 9 },
  { id: 'host:d', firstSeenDaysAgo: 100, score: 80 },
];

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.lifecycle.first_seen': DATE,
        'entity.risk.calculated_score': { type: 'double' },
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  const operations = ENTITIES.flatMap(({ id, firstSeenDaysAgo, score, resolvedTo }) => [
    { index: { _index: ENTITY_INDEX } },
    {
      'entity.id': id,
      'entity.name': id.split(':')[1],
      'entity.lifecycle.first_seen': new Date(now - firstSeenDaysAgo * DAY_MS).toISOString(),
      ...(score === undefined ? {} : { 'entity.risk.calculated_score': score }),
      ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
    },
  ]);
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the New entity fixture failed');
};

describe('New entity tile on Elasticsearch', () => {
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

  /** The previous period returns only the count; this adds the ids back to check WHICH entities counted. */
  const withEntityIds = (query: string) =>
    query.replace(
      '| STATS BY effective_id\n| STATS value = COUNT(effective_id)',
      '| STATS entity_ids = VALUES(entity.id) BY effective_id\n| STATS value = COUNT(effective_id), entity_ids = VALUES(entity_ids)'
    );

  const runTile = async (period: 'current' | 'previous') => {
    const built = buildNewEntityCountQuery(ENTITY_INDEX, '7d', [], period);
    const query = period === 'previous' ? withEntityIds(built) : built;
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return { count: Number(row.value), ids: [row.entity_ids ?? []].flat().map(String).sort() };
  };

  it('counts the current period as the entities first seen in the last 7 days with a score', async () => {
    // host:alias resolves to host:a, so they count once; the id list keeps both rows for the table.
    expect(await runTile('current')).toEqual({
      count: 2,
      ids: ['host:a', 'host:alias', 'host:f'],
    });
  });

  it('counts the previous period as the entities first seen in the 7 days before that', async () => {
    expect(await runTile('previous')).toEqual({ count: 1, ids: ['host:b', 'host:e'] });
  });

  it('returns only the count for the previous period, not the entity ids', async () => {
    const { columns } = await client.esql.query({
      query: buildNewEntityCountQuery(ENTITY_INDEX, '7d', [], 'previous'),
    });
    expect(columns.map(({ name }) => name)).toEqual(['value']);
  });

  it('gives the delta as the current count minus the previous count', async () => {
    const [current, previous] = [await runTile('current'), await runTile('previous')];
    expect(current.count - previous.count).toBe(1);
  });
});
