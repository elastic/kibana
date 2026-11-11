/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClientMock } from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getOtelErrors } from './get_otel_errors';

const PARAMS = { serviceName: 'shop', start: 10, end: 20 };

describe('getOtelErrors', () => {
  it('searches the OTel logs of the application', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockResolvedValue({} as never);

    await getOtelErrors({ esClient, ...PARAMS });

    const [[request]] = client.search.mock.calls;
    expect(request?.index).toBe('logs-*.otel-*');
    expect(request?.query?.bool?.filter).toContainEqual({ term: { 'service.name': 'shop' } });
  });

  it('returns no errors and no environments when the indices hold nothing', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockResolvedValue({} as never);

    await expect(getOtelErrors({ esClient, ...PARAMS })).resolves.toEqual({
      serviceName: 'shop',
      errors: [],
      hasMoreErrors: false,
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
        inEnvironment: { exceptions: { groups: { buckets: [] } } },
      },
    } as never);

    const { environments } = await getOtelErrors({ esClient, ...PARAMS });

    expect(environments).toEqual(['ENVIRONMENT_NOT_DEFINED', 'production', 'staging']);
  });

  it('fails when the search fails, instead of reporting no errors', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(getOtelErrors({ esClient, ...PARAMS })).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});
