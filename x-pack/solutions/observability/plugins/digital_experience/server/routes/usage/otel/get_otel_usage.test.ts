/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClientMock } from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
import { termsAggregate } from '../../../lib/helpers/aggregate_fixtures.test_helpers';
import { getOtelUsage } from './get_otel_usage';

const PARAMS = { serviceName: 'shop', start: 10, end: 20 };

describe('getOtelUsage', () => {
  it('searches the OTel logs of the application', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockResolvedValue({} as never);

    await getOtelUsage({ esClient, ...PARAMS });

    expect(client.search).toHaveBeenCalledTimes(1);
    const [[request]] = client.search.mock.calls;
    expect(request?.index).toBe('logs-*.otel-*');
    expect(request?.query?.bool?.filter).toContainEqual({ term: { 'service.name': 'shop' } });
  });

  it('returns empty lists when the indices hold nothing', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockResolvedValue({} as never);

    await expect(getOtelUsage({ esClient, ...PARAMS })).resolves.toEqual({
      serviceName: 'shop',
      topPages: [],
      breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
      topClicks: [],
      totalClicks: 0,
      frustration: { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0, sessions: 0 },
      frustratedElements: [],
      frustratedPages: [],
      environments: [],
    });
  });

  it('lists the environments of the application, "Not defined" first', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockResolvedValue({
      aggregations: {
        environments: { buckets: [{ key: 'production' }] },
        environmentNames: { buckets: [{ key: 'staging' }] },
        environmentNotDefined: { doc_count: 1 },
        inEnvironment: {
          pageLoads: {
            doc_count: 0,
            topPages: termsAggregate([]),
            browsers: termsAggregate([]),
            operatingSystems: termsAggregate([]),
            devices: termsAggregate([]),
          },
          clicks: { doc_count: 0, selectors: termsAggregate([]) },
          frustration: {
            doc_count: 0,
            byType: termsAggregate([]),
            sessions: { value: 0 },
            elements: termsAggregate([]),
            pages: termsAggregate([]),
          },
        },
      },
    } as never);

    const { environments } = await getOtelUsage({ esClient, ...PARAMS });

    expect(environments).toEqual(['ENVIRONMENT_NOT_DEFINED', 'production', 'staging']);
  });

  it('fails when the search fails, instead of reporting empty panels', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(getOtelUsage({ esClient, ...PARAMS })).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});
