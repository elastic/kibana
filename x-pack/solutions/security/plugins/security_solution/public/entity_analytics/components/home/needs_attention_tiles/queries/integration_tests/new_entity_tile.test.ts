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
 *
 * Groups are judged by the group: its EARLIEST member decides when it was first seen, and its own
 * (resolution) score decides the score, else the main entity's.
 *
 * | main entity | first_seen | score own / group | alias (first_seen)  | counted as                               |
 * |-------------|------------|-------------------|---------------------|------------------------------------------|
 * | host:g1     | 100d       | 5                 | host:g1a (1d)       | not new: the main entity is old          |
 * | host:g2     | 2d         | 5                 | host:g2a (50d)      | not new: an alias is old                 |
 * | host:g3     | 200d       | 5                 | host:g3a (150d)     | not new: both are old                    |
 * | host:g4     | 3d         | 5 / 0             | host:g4a (4d)       | dropped: the group's score is 0          |
 * | host:g5     | 5d         | 0 / 7             | host:g5a (6d)       | new: the group's score is above 0, id host:g5 |
 */

const ENTITY_INDEX = 'entities-latest-new-entity-tile-test';
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

interface EntitySeed {
  id: string;
  firstSeenDaysAgo: number;
  score?: number;
  /** The group's own (resolution) score, on a main entity. */
  groupScore?: number;
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
  { id: 'host:g1', firstSeenDaysAgo: 100, score: 5 },
  { id: 'host:g1a', firstSeenDaysAgo: 1, score: 5, resolvedTo: 'host:g1' },
  { id: 'host:g2', firstSeenDaysAgo: 2, score: 5 },
  { id: 'host:g2a', firstSeenDaysAgo: 50, score: 5, resolvedTo: 'host:g2' },
  { id: 'host:g3', firstSeenDaysAgo: 200, score: 5 },
  { id: 'host:g3a', firstSeenDaysAgo: 150, score: 5, resolvedTo: 'host:g3' },
  { id: 'host:g4', firstSeenDaysAgo: 3, score: 5, groupScore: 0 },
  { id: 'host:g4a', firstSeenDaysAgo: 4, score: 5, resolvedTo: 'host:g4' },
  { id: 'host:g5', firstSeenDaysAgo: 5, score: 0, groupScore: 7 },
  { id: 'host:g5a', firstSeenDaysAgo: 6, score: 5, resolvedTo: 'host:g5' },
];

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the query can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.lifecycle.first_seen': DATE,
        'entity.risk.calculated_score': { type: 'double' },
        'entity.relationships.resolution.risk.calculated_score': { type: 'double' },
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  const operations = ENTITIES.flatMap(({ id, firstSeenDaysAgo, score, groupScore, resolvedTo }) => [
    { index: { _index: ENTITY_INDEX } },
    {
      'entity.id': id,
      'entity.name': id.split(':')[1],
      'entity.lifecycle.first_seen': new Date(now - firstSeenDaysAgo * DAY_MS).toISOString(),
      ...(score === undefined ? {} : { 'entity.risk.calculated_score': score }),
      ...(groupScore === undefined
        ? {}
        : { 'entity.relationships.resolution.risk.calculated_score': groupScore }),
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
      '| STATS value = COUNT(effective_id)',
      '| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)'
    );

  const runTile = async (period: 'current' | 'previous') => {
    const built = buildNewEntityCountQuery(ENTITY_INDEX, '7d', [], period);
    const query = period === 'previous' ? withEntityIds(built) : built;
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return { count: Number(row.value), ids: [row.entity_ids ?? []].flat().map(String).sort() };
  };

  it('counts the current period as the entities first seen in the last 7 days with a score', async () => {
    // host:alias resolves to host:a, so they count once, under the main entity's id. Groups g1 to g4
    // do not count (see the table above); host:g5 does, through its group's score.
    expect(await runTile('current')).toEqual({
      count: 3,
      ids: ['host:a', 'host:f', 'host:g5'],
    });
  });

  it('counts the previous period as the entities first seen in the 7 days before that', async () => {
    // host:e is older than host:b, so the group was first seen 12 days ago, in the previous period.
    expect(await runTile('previous')).toEqual({ count: 1, ids: ['host:b'] });
  });

  it('returns only the count for the previous period, not the entity ids', async () => {
    const { columns } = await client.esql.query({
      query: buildNewEntityCountQuery(ENTITY_INDEX, '7d', [], 'previous'),
    });
    expect(columns.map(({ name }) => name)).toEqual(['value']);
  });

  it('gives the delta as the current count minus the previous count', async () => {
    const [current, previous] = [await runTile('current'), await runTile('previous')];
    expect(current.count - previous.count).toBe(2);
  });
});
