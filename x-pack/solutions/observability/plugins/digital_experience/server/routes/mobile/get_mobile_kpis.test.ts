/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getMobileKpis } from './get_mobile_kpis';

const HOUR = 60 * 60 * 1000;

describe('getMobileKpis', () => {
  it('has no data, and no values, without mobile documents', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(
      esqlResponse([{ docs: 0, sessions: 0, users: 0, exceptions: 0 }])
    );

    const kpis = await getMobileKpis({
      esClient,
      filters: { serviceName: 'shop-mobile' },
      start: 0,
      end: HOUR,
    });

    expect(kpis.hasData).toBe(false);
    expect(kpis.errorRate.value).toBeNull();
  });

  it('compares the period with the previous one on the OS, and lists the picker options', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([{ docs: 20, sessions: 4, users: 2, exceptions: 2 }]))
      .mockResolvedValueOnce(esqlResponse([{ docs: 10, sessions: 2, users: 2, exceptions: 0 }]))
      .mockResolvedValueOnce(
        esqlResponse([
          { sessions: 4, release: '1.0.0' },
          { sessions: 3, release: '1.1.0' },
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([
          { sessions: 3, os_name: 'iOS', platform: 'ios' },
          { sessions: 1, os_name: 'iPadOS', platform: 'ios' },
          { sessions: 1, os_name: null, platform: 'android' },
        ])
      )
      .mockResolvedValueOnce(esqlResponse([{ docs: 20, 'service.environment': 'production' }]));

    const kpis = await getMobileKpis({
      esClient,
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
        errorRate: { value: 0.5, previous: 0, delta: 0.5 },
        releases: ['1.0.0', '1.1.0'],
        osNames: ['iOS', 'iPadOS'],
        platforms: ['android', 'ios'],
        environments: ['production'],
      })
    );
    // No crash-free sessions until a crash is defined (#64), rather than a value that's always empty.
    expect(kpis).not.toHaveProperty('crashFreeSessions');
    const [[currentRequest], [previousRequest], [releasesRequest], [osRequest]] =
      client.esql.query.mock.calls;
    // The previous period has the same length and ends, exclusive, where the range starts.
    expect(previousRequest.filter).toEqual({
      bool: {
        filter: [
          { range: { '@timestamp': { gte: 0, lt: HOUR, format: 'epoch_millis' } } },
          expect.anything(),
        ],
      },
    });
    // The routes send the values as params; Discover gets them in the query.
    expect(currentRequest.params).toEqual([{ service_name: 'shop-mobile' }, { os_name: 'iOS' }]);
    // The releases are those of the OS; the OS names are all of them.
    expect(releasesRequest.params).toEqual([{ service_name: 'shop-mobile' }, { os_name: 'iOS' }]);
    expect(osRequest.params).toEqual([{ service_name: 'shop-mobile' }]);
    expect(kpis.esql).toContain('`service.name` == "shop-mobile"');
    expect(kpis.esql).toContain('`resource.attributes.os.name` == "iOS"');
    expect(kpis.esql).toContain('`service.environment` == "production"');
  });
});
