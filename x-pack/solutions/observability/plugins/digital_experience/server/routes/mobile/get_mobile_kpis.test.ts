/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getMobileKpis } from './get_mobile_kpis';

const esql = (columns: string[], values: unknown[][]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values,
});

const STATS_COLUMNS = ['docs', 'sessions', 'users', 'exceptions'];

describe('getMobileKpis', () => {
  it('lists the platforms by SDK name and the releases by sessions', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(esql(STATS_COLUMNS, [[10, 4, 3, 2]]))
      .mockResolvedValueOnce(esql(STATS_COLUMNS, [[5, 2, 2, 0]]))
      .mockResolvedValueOnce(
        esql(
          ['sessions', 'service.version', 'resource.attributes.telemetry.sdk.name'],
          [
            [1, '1.0.0', 'android'],
            [3, '1.1.0', 'iOS'],
          ]
        )
      )
      .mockResolvedValueOnce(esql(['docs', 'service.environment'], [[10, 'production']]));
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    const kpis = await getMobileKpis({
      esClient,
      filters: { serviceName: 'shop-mobile', platform: 'ios' },
      start: Date.parse('2021-01-18T12:00:00.000Z'),
      end: Date.parse('2021-01-18T13:00:00.000Z'),
    });

    expect(query.mock.calls[2][0].query).toContain(
      'BY service.version, resource.attributes.telemetry.sdk.name'
    );
    expect(query.mock.calls[0][0].query).toContain(
      'resource.attributes.telemetry.sdk.name == "iOS"'
    );
    expect(kpis).toMatchObject({
      hasData: true,
      sessions: { value: 4, previous: 2, delta: 2 },
      users: { value: 3, previous: 2, delta: 1 },
      errorRate: { value: 0.5, previous: 0, delta: 0.5 },
      platforms: ['android', 'ios'],
      releases: ['1.1.0', '1.0.0'],
      environments: ['production'],
      bucket: 'hour',
    });
  });
});
