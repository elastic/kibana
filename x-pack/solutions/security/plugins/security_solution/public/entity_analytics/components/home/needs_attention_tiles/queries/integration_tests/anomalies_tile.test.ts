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
import { buildEntitiesWithAnomaliesCountQuery } from '../entities_with_anomalies_query';

/*
 * Entities and ML anomaly records whose anomaly tile results are known by construction, for the
 * 7d range: the current period is the last 7 days, the previous one the 7 days before that.
 * Entity ids come from host.id (`host:<host.id>`).
 *
 * | entity.id  | records (job, score, interim, days ago)   | notes                            |
 * |------------|-------------------------------------------|----------------------------------|
 * | host:a     | job_a 50 now 3                            | current                          |
 * | host:alias | job_a 50 now 4                            | resolves to host:a, one entity   |
 * | host:b     | job_a 50 now 10                           | previous                         |
 * | host:c     | job_a 50 now 2, job_a 50 now 9            | both periods                     |
 * | host:d     | job_a 50 now 1                            | current                          |
 * | host:low   | job_a 0 now 3                             | dropped: score below 1           |
 * | host:live  | job_a 50 interim 3                        | dropped: interim record          |
 * | host:other | job_x 50 now 3                            | dropped: not an installed job    |
 * | host:ghost | job_a 50 now 3                            | dropped: no entity doc           |
 */

const ENTITY_INDEX = 'entities-latest-anomalies-tiles-test';
const ANOMALY_INDEX = '.ml-anomalies-shared-tiles-test';
const JOBS = ['job_a'];
const DAY_MS = 24 * 60 * 60 * 1000;

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const ENTITIES: ReadonlyArray<{ id: string; resolvedTo?: string }> = [
  { id: 'host:a' },
  { id: 'host:alias', resolvedTo: 'host:a' },
  { id: 'host:b' },
  { id: 'host:c' },
  { id: 'host:d' },
  { id: 'host:low' },
  { id: 'host:live' },
  { id: 'host:other' },
];

interface RecordSeed {
  job: string;
  host: string;
  score: number;
  daysAgo: number;
  interim?: boolean;
}

const RECORDS: readonly RecordSeed[] = [
  { job: 'job_a', host: 'a', score: 50, daysAgo: 3 },
  { job: 'job_a', host: 'alias', score: 50, daysAgo: 4 },
  { job: 'job_a', host: 'b', score: 50, daysAgo: 10 },
  { job: 'job_a', host: 'c', score: 50, daysAgo: 2 },
  { job: 'job_a', host: 'c', score: 50, daysAgo: 9 },
  { job: 'job_a', host: 'd', score: 50, daysAgo: 1 },
  { job: 'job_a', host: 'low', score: 0, daysAgo: 3 },
  { job: 'job_a', host: 'live', score: 50, daysAgo: 3, interim: true },
  { job: 'job_x', host: 'other', score: 50, daysAgo: 3 },
  { job: 'job_a', host: 'ghost', score: 50, daysAgo: 3 },
];

const loadFixture = async (client: Client) => {
  const now = Date.now();
  await client.indices.create({
    index: ENTITY_INDEX,
    // In lookup mode, so the anomalies query can LOOKUP JOIN it.
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: ANOMALY_INDEX,
    mappings: {
      properties: {
        '@timestamp': DATE,
        result_type: KEYWORD,
        job_id: KEYWORD,
        is_interim: { type: 'boolean' },
        record_score: { type: 'double' },
        'host.id': KEYWORD,
      },
    },
  });
  const operations = [
    ...ENTITIES.flatMap(({ id, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    ...RECORDS.flatMap(({ job, host, score, daysAgo, interim }) => [
      { index: { _index: ANOMALY_INDEX } },
      {
        '@timestamp': new Date(now - daysAgo * DAY_MS).toISOString(),
        result_type: 'record',
        job_id: job,
        is_interim: Boolean(interim),
        record_score: score,
        'host.id': host,
      },
    ]),
  ];
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the anomaly tile fixture failed');
};

describe('entities with anomalies tile on Elasticsearch', () => {
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
    const built = buildEntitiesWithAnomaliesCountQuery(ENTITY_INDEX, '7d', [], JOBS, period);
    const query = period === 'previous' ? withEntityIds(built) : built;
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return {
      count: Number(row.value),
      ids: [row.entity_ids ?? []].flat().map(String).sort(),
    };
  };

  it('counts the current period as the last 7 days, with aliases collapsed into one entity', async () => {
    expect(await runTile('current')).toEqual({ count: 3, ids: ['host:a', 'host:c', 'host:d'] });
  });

  it('counts the previous period as the 7 days before that', async () => {
    expect(await runTile('previous')).toEqual({ count: 2, ids: ['host:b', 'host:c'] });
  });

  it('returns only the count for the previous period, not the entity ids', async () => {
    const { columns } = await client.esql.query({
      query: buildEntitiesWithAnomaliesCountQuery(ENTITY_INDEX, '7d', [], JOBS, 'previous'),
    });
    expect(columns.map(({ name }) => name)).toEqual(['value']);
  });

  it('gives the delta as the current count minus the previous count', async () => {
    const [current, previous] = [await runTile('current'), await runTile('previous')];
    expect(current.count - previous.count).toBe(1);
  });
});
