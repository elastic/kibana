/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '../../../entities_grid/common';
import { buildEntitiesWithAnomaliesCountQuery } from '../entities_with_anomalies_query';
import {
  anomaliesSeriesColumn,
  buildEntitiesWithAnomaliesSeriesQuery,
} from '../entities_with_anomalies_series_query';
import {
  describeSeriesFollowsCount,
  moveWindowBack,
  readCounts,
} from './series_follow_count_suite';

/*
 * The Entities with anomalies sparkline dots must follow the tile count. Dot k is the count query
 * with its window moved back k steps, so this test runs the real count query once per dot.
 * Records sit half an hour off a whole hour, so none is on the edge of a bucket. Entity ids come
 * from host.id (`host:<host.id>`); the installed job is job_a.
 *
 * | entity.id  | records (job, score, interim, hours ago)  | notes                             |
 * |------------|-------------------------------------------|-----------------------------------|
 * | host:a     | job_a 50 now 2.5, job_a 50 now 30.5       |                                   |
 * | host:alias | job_a 50 now 5.5                          | resolves to host:a, one entity    |
 * | host:b     | job_a 50 now 100.5                        |                                   |
 * | host:c     | job_a 50 now at 10.5, 20.5 and 300.5      | many buckets of one window        |
 * | host:d     | job_a 50 now 1.5                          |                                   |
 * | host:low   | job_a 0 now 3.5                           | dropped: score below 1            |
 * | host:live  | job_a 50 interim 3.5                      | dropped: interim record           |
 * | host:other | job_x 50 now 3.5                          | dropped: not an installed job     |
 * | host:ghost | job_a 50 now 3.5                          | dropped: no entity doc            |
 */

const ENTITY_INDEX = 'entities-latest-anomalies-series-test';
const ANOMALY_INDEX = '.ml-anomalies-shared-series-test';
const JOBS = ['job_a'];
const HOUR_MS = 60 * 60 * 1000;
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

const RECORDS: ReadonlyArray<{
  job: string;
  host: string;
  score: number;
  hoursAgo: number;
  interim?: boolean;
}> = [
  { job: 'job_a', host: 'a', score: 50, hoursAgo: 2.5 },
  { job: 'job_a', host: 'a', score: 50, hoursAgo: 30.5 },
  { job: 'job_a', host: 'alias', score: 50, hoursAgo: 5.5 },
  { job: 'job_a', host: 'b', score: 50, hoursAgo: 100.5 },
  { job: 'job_a', host: 'c', score: 50, hoursAgo: 10.5 },
  { job: 'job_a', host: 'c', score: 50, hoursAgo: 20.5 },
  { job: 'job_a', host: 'c', score: 50, hoursAgo: 300.5 },
  { job: 'job_a', host: 'd', score: 50, hoursAgo: 1.5 },
  { job: 'job_a', host: 'low', score: 0, hoursAgo: 3.5 },
  { job: 'job_a', host: 'live', score: 50, hoursAgo: 3.5, interim: true },
  { job: 'job_x', host: 'other', score: 50, hoursAgo: 3.5 },
  { job: 'job_a', host: 'ghost', score: 50, hoursAgo: 3.5 },
];

const loadFixture = async (client: Client) => {
  await client.indices.create({
    index: ENTITY_INDEX,
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
  const now = Date.now();
  const response = await client.bulk({
    operations: [
      ...ENTITIES.flatMap(({ id, resolvedTo }) => [
        { index: { _index: ENTITY_INDEX } },
        {
          'entity.id': id,
          'entity.name': id.split(':')[1],
          ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
        },
      ]),
      ...RECORDS.flatMap(({ job, host, score, hoursAgo, interim }) => [
        { index: { _index: ANOMALY_INDEX } },
        {
          '@timestamp': new Date(now - hoursAgo * HOUR_MS).toISOString(),
          result_type: 'record',
          job_id: job,
          is_interim: Boolean(interim),
          record_score: score,
          'host.id': host,
        },
      ]),
    ],
    refresh: 'wait_for',
  });
  if (response.errors) throw new Error('Bulk indexing of the anomaly series fixture failed');
};

const buildCount = (range: TimeRange) =>
  buildEntitiesWithAnomaliesCountQuery(ENTITY_INDEX, range, [], JOBS);

describeSeriesFollowsCount({
  name: 'Entities with anomalies tile series',
  loadFixture,
  tiles: [
    {
      name: 'Entities with anomalies',
      column: anomaliesSeriesColumn,
      // 24h: host:a (2.5h, and host:alias 5.5h), host:c (10.5h, 20.5h), host:d. Not low, live,
      // other, ghost.
      // 30d: host:a, host:b, host:c (300.5h is inside 720h), host:d.
      byHand: { '24h': 3, '30d': 4 },
    },
  ],
  seriesQuery: (range) => buildEntitiesWithAnomaliesSeriesQuery(ENTITY_INDEX, range, [], JOBS),
  countNow: async (range, run) => readCounts(await run(buildCount(range)), ['value']),
  countStepsAgo: async (range, k, run) =>
    readCounts(
      await run(
        moveWindowBack({
          base: buildCount(range),
          window: /@timestamp >= NOW\(\) - \d+ (days|hours)/,
          field: '@timestamp',
          range,
          k,
        })
      ),
      ['value']
    ),
});
