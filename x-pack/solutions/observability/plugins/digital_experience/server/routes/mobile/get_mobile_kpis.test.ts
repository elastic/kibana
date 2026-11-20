/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MOBILE_FIELDS } from '../../../common/mobile_panel';
import { getMobileKpis } from './get_mobile_kpis';

const HOUR = 60 * 60 * 1000;
const ALL_MAPPED = Object.values(MOBILE_FIELDS);

const esql = (columns: string[], values: unknown[][]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values,
});

const clientMapping = (mapped: string[], query: jest.Mock) =>
  ({
    fieldCaps: jest
      .fn()
      .mockResolvedValue({ fields: Object.fromEntries(mapped.map((field) => [field, {}])) }),
    esql: { query },
  } as unknown as ElasticsearchClient);

describe('getMobileKpis', () => {
  it('has no data, without querying, when no readable index has mobile data', async () => {
    const query = jest.fn();

    const kpis = await getMobileKpis({
      esClient: clientMapping([], query),
      filters: { serviceName: 'shop-mobile' },
      start: 0,
      end: HOUR,
    });

    expect(kpis.hasData).toBe(false);
    expect(kpis.sessions.value).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('compares the period with the previous one and lists the picker options', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(esql(['docs', 'sessions', 'users', 'exceptions'], [[20, 4, 2, 2]]))
      .mockResolvedValueOnce(esql(['docs', 'sessions', 'users', 'exceptions'], [[10, 2, 2, 0]]))
      .mockResolvedValueOnce(
        esql(
          ['docs', 'sessions', 'service.version'],
          [
            [8, 3, '1.1.0'],
            [4, 2, '1.0.0 (1)'],
            [4, 2, '1.0.0 (2)'],
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
      esClient: clientMapping(ALL_MAPPED, query),
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
    // The previous period has the same length and ends where the range starts.
    expect(query.mock.calls[1][0].filter.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 0, lte: HOUR, format: 'epoch_millis' } },
    });
    expect(kpis.esql).toContain('telemetry.sdk.name == "iOS"');
    expect(kpis.esql).toContain('service.environment == "production"');
  });
});
