/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClientMock } from './create_digital_experience_traced_es_client.test_helpers';

describe('createDigitalExperienceTracedEsClient', () => {
  it('passes the abort signal to every search and returns its response', async () => {
    const signal = new AbortController().signal;
    const { client, esClient } = createTracedEsClientMock(signal);
    client.search.mockResolvedValue({ body: { aggregations: { total: { value: 3 } } } } as never);

    const request = { index: 'logs-*', size: 0, track_total_hits: false };
    const response = await esClient.search('get_digital_experience_test', request);

    expect(client.search).toHaveBeenCalledWith(request, expect.objectContaining({ signal }));
    expect(response).toEqual({ aggregations: { total: { value: 3 } } });
  });
});
