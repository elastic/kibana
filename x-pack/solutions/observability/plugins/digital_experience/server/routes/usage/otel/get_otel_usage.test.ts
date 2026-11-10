/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClientMock } from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
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
      topPages: [],
      breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
      topClicks: [],
      totalClicks: 0,
    });
  });

  it('fails when the search fails, instead of reporting empty panels', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(getOtelUsage({ esClient, ...PARAMS })).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});
