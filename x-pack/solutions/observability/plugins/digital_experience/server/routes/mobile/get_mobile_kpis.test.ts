/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getMobileKpis } from './get_mobile_kpis';

const HOUR = 60 * 60 * 1000;

const esql = (columns: string[], values: unknown[][]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values,
});

const clientWith = (query: jest.Mock) => ({ esql: { query } } as unknown as ElasticsearchClient);

describe('getMobileKpis', () => {
  it('has no data, and no values, without mobile documents', async () => {
    const query = jest
      .fn()
      .mockResolvedValue(esql(['docs', 'sessions', 'users', 'exceptions'], [[0, 0, 0, 0]]));

    const kpis = await getMobileKpis({
      esClient: clientWith(query),
      filters: { serviceName: 'shop-mobile' },
      start: 0,
      end: HOUR,
    });

    expect(kpis.hasData).toBe(false);
    expect(kpis.errorRate.value).toBeNull();
  });

  it('compares the period with the previous one and lists the picker options', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(esql(['docs', 'sessions', 'users', 'exceptions'], [[20, 4, 2, 2]]))
      .mockResolvedValueOnce(esql(['docs', 'sessions', 'users', 'exceptions'], [[10, 2, 2, 0]]))
      .mockResolvedValueOnce(
        esql(
          ['docs', 'sessions', 'release'],
          [
            [8, 4, '1.0.0'],
            [8, 3, '1.1.0'],
          ]
        )
      )
      .mockResolvedValueOnce(
        esql(
          ['docs', 'resource.attributes.telemetry.sdk.name'],
          [
            [10, 'iOS'],
            [10, 'android'],
          ]
        )
      )
      .mockResolvedValueOnce(esql(['docs', 'service.environment'], [[20, 'production']]));

    const kpis = await getMobileKpis({
      esClient: clientWith(query),
      filters: { serviceName: 'shop-mobile', platform: 'ios' },
      start: HOUR,
      end: 2 * HOUR,
      environment: 'production',
    });

    expect(kpis).toEqual(
      expect.objectContaining({
        hasData: true,
        sessions: { value: 4, previous: 2, delta: 2 },
        users: { value: 2, previous: 2, delta: 0 },
        crashFreeSessions: { value: null, previous: null, delta: null },
        errorRate: { value: 0.5, previous: 0, delta: 0.5 },
        platforms: ['android', 'ios'],
        releases: ['1.0.0', '1.1.0'],
        environments: ['production'],
        bucket: 'hour',
      })
    );
    // The previous period has the same length and ends, exclusive, where the range starts.
    expect(query.mock.calls[1][0].filter.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 0, lt: HOUR, format: 'epoch_millis' } },
    });
    // The routes send the values as params; Discover gets them in the query.
    expect(query.mock.calls[0][0].params).toEqual([{ service_name: 'shop-mobile' }]);
    expect(query.mock.calls[0][0].query).toContain('service.name == ?service_name');
    expect(kpis.esql).toContain('service.name == "shop-mobile"');
    expect(kpis.esql).toContain('telemetry.sdk.name == "iOS"');
    expect(kpis.esql).toContain('service.environment == "production"');
  });
});
