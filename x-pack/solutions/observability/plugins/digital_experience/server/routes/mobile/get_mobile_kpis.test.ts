/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getMobileKpis } from './get_mobile_kpis';

const HOUR = 60 * 60 * 1000;

const clientWith = (esqlCall: jest.Mock) =>
  ({ esql: esqlCall } as unknown as TracedElasticsearchClient);

describe('getMobileKpis', () => {
  it('has no data, and no values, without mobile documents', async () => {
    const esqlCall = jest
      .fn()
      .mockResolvedValue({ hits: [{ docs: 0, sessions: 0, users: 0, exceptions: 0 }] });

    const kpis = await getMobileKpis({
      esClient: clientWith(esqlCall),
      filters: { serviceName: 'shop-mobile' },
      start: 0,
      end: HOUR,
    });

    expect(kpis.hasData).toBe(false);
    expect(kpis.errorRate.value).toBeNull();
  });

  it('compares the period with the previous one on the OS, and lists the picker options', async () => {
    const esqlCall = jest
      .fn()
      .mockResolvedValueOnce({ hits: [{ docs: 20, sessions: 4, users: 2, exceptions: 2 }] })
      .mockResolvedValueOnce({ hits: [{ docs: 10, sessions: 2, users: 2, exceptions: 0 }] })
      .mockResolvedValueOnce({
        hits: [
          { sessions: 4, release: '1.0.0' },
          { sessions: 3, release: '1.1.0' },
        ],
      })
      .mockResolvedValueOnce({
        hits: [
          { sessions: 3, os_name: 'iOS', platform: 'ios' },
          { sessions: 1, os_name: 'iPadOS', platform: 'ios' },
          { sessions: 1, os_name: null, platform: 'android' },
        ],
      })
      .mockResolvedValueOnce({ hits: [{ docs: 20, 'service.environment': 'production' }] });

    const kpis = await getMobileKpis({
      esClient: clientWith(esqlCall),
      filters: { serviceName: 'shop-mobile', osName: 'iOS' },
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
        releases: ['1.0.0', '1.1.0'],
        osNames: ['iOS', 'iPadOS'],
        platforms: ['android', 'ios'],
        environments: ['production'],
        bucket: 'hour',
      })
    );
    const [[, currentRequest], [, previousRequest], [, releasesRequest], [, osRequest]] =
      esqlCall.mock.calls;
    // The previous period has the same length and ends, exclusive, where the range starts.
    expect(previousRequest.filter.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: 0, lt: HOUR, format: 'epoch_millis' } },
    });
    // The routes send the values as params; Discover gets them in the query.
    expect(currentRequest.params).toEqual([{ service_name: 'shop-mobile' }, { os_name: 'iOS' }]);
    // The releases are those of the OS; the OS names are all of them.
    expect(releasesRequest.params).toEqual([{ service_name: 'shop-mobile' }, { os_name: 'iOS' }]);
    expect(osRequest.params).toEqual([{ service_name: 'shop-mobile' }]);
    expect(osRequest.query).toContain('BY os_name = `resource.attributes.os.name`, platform');
    expect(kpis.esql).toContain('`service.name` == "shop-mobile"');
    expect(kpis.esql).toContain('`resource.attributes.os.name` == "iOS"');
    expect(kpis.esql).toContain('`service.environment` == "production"');
  });
});
