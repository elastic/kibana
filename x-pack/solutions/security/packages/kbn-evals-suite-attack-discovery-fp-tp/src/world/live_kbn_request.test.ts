/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiveKbnRequest } from './live_kbn_request';

describe('createLiveKbnRequest', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockFetch = () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => '{"ok":true}',
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

  it('sends an ApiKey Authorization header when apiKey is set, ignoring username/password', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'https://project.kb.qa.elastic.cloud',
      apiKey: 'c29tZS1hcGkta2V5',
      username: 'elastic',
      password: 'changeme',
    });

    await kbnRequest({ method: 'GET', path: '/api/status' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('ApiKey c29tZS1hcGkta2V5');
  });

  it('sends a Basic Authorization header derived from username/password when apiKey is absent', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'http://127.0.0.1:5601',
      username: 'elastic',
      password: 'changeme',
    });

    await kbnRequest({ method: 'GET', path: '/api/status' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
    );
  });

  it('requests the joined Kibana URL with the standard Kibana headers', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'http://127.0.0.1:5601/sbb',
      apiKey: 'key',
      username: 'elastic',
      password: 'changeme',
    });

    await kbnRequest({ method: 'POST', path: '/api/detection_engine/index', body: { a: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:5601/sbb/api/detection_engine/index');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('returns the response status code and parsed JSON body', async () => {
    mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'http://127.0.0.1:5601',
      apiKey: 'key',
      username: 'elastic',
      password: 'changeme',
    });

    const result = await kbnRequest({ method: 'GET', path: '/api/status' });

    expect(result).toEqual({ statusCode: 200, body: { ok: true } });
  });
});
