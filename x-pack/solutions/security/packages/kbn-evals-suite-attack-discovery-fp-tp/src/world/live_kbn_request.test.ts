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
      apiKey: 'some-api-key',
      username: 'elastic',
      password: 'changeme',
    });

    await kbnRequest({ method: 'GET', path: '/api/status' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('ApiKey some-api-key');
    expect(String(url)).toBe('https://project.kb.qa.elastic.cloud/api/status');
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

  it('scopes every request to the space when one is given', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'https://project.kb.qa.elastic.cloud',
      apiKey: 'some-api-key',
      space: 'fptp-eval-1',
    });

    await kbnRequest({ method: 'POST', path: '/api/detection_engine/index' });

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://project.kb.qa.elastic.cloud/s/fptp-eval-1/api/detection_engine/index'
    );
  });

  it('does not prefix the default space', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'http://127.0.0.1:5601',
      username: 'elastic',
      password: 'changeme',
      space: 'default',
    });

    await kbnRequest({ method: 'GET', path: '/api/status' });

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:5601/api/status');
  });

  it('sends the standard Kibana headers and the api version when given', async () => {
    const fetchMock = mockFetch();
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: 'http://127.0.0.1:5601',
      username: 'elastic',
      password: 'changeme',
    });

    await kbnRequest({
      method: 'POST',
      path: '/api/workflows',
      body: { a: 1 },
      version: '2023-10-31',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['kbn-xsrf']).toBe('true');
    expect(init.headers['x-elastic-internal-origin']).toBe('kibana');
    expect(init.headers['elastic-api-version']).toBe('2023-10-31');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });
});
