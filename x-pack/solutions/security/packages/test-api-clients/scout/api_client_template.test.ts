/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { SecuritySolutionScoutApiServiceProvider as createDetectionsApi } from './detections.gen';

/**
 * Guards the runtime behaviour of the `api_client_scout` generator template through one of its
 * bundles. The generated code is only exercised end to end by Scout suites that run against a live
 * stack, so serialization details (array query params, export payloads) are pinned here.
 */
describe('generated Scout API client (api_client_scout template)', () => {
  const response: ApiClientResponse = {
    statusCode: 200,
    statusMessage: 'OK',
    headers: {},
    body: {},
  };

  const createApiClientMock = (): jest.Mocked<ApiClientFixture> => ({
    get: jest.fn().mockResolvedValue(response),
    post: jest.fn().mockResolvedValue(response),
    put: jest.fn().mockResolvedValue(response),
    delete: jest.fn().mockResolvedValue(response),
    patch: jest.fn().mockResolvedValue(response),
    head: jest.fn().mockResolvedValue(response),
  });

  const parseRequestUrl = (url: string): { pathname: string; searchParams: URLSearchParams } => {
    const { pathname, searchParams } = new URL(url, 'http://kibana.test');

    return { pathname, searchParams };
  };

  it('serializes array query params as repeated keys, matching the FTR client', async () => {
    const apiClient = createApiClientMock();
    const detectionsApi = createDetectionsApi(apiClient);

    await detectionsApi.findRules({ query: { fields: ['name', 'enabled'], page: 2 } });

    const [url] = apiClient.get.mock.calls[0];
    const { pathname, searchParams } = parseRequestUrl(url);

    expect(pathname).toBe('/api/detection_engine/rules/_find');
    expect(searchParams.getAll('fields')).toEqual(['name', 'enabled']);
    expect(searchParams.get('page')).toBe('2');
    expect(url).not.toContain('name,enabled');
    expect(url).not.toContain('fields[]');
  });

  it('lets exports override the response type and forwards the typed body', async () => {
    const apiClient = createApiClientMock();
    const detectionsApi = createDetectionsApi(apiClient);
    const body = { objects: [{ rule_id: 'rule-1' }] };

    await detectionsApi.exportRules(
      { query: { exclude_export_details: true }, body },
      { responseType: 'text' }
    );

    const [url, options] = apiClient.post.mock.calls[0];
    const { pathname, searchParams } = parseRequestUrl(url);

    expect(pathname).toBe('/api/detection_engine/rules/_export');
    expect(searchParams.get('exclude_export_details')).toBe('true');
    expect(options).toMatchObject({ body, responseType: 'text' });
  });

  it('defaults to a JSON response and sends the Kibana headers', async () => {
    const apiClient = createApiClientMock();
    const detectionsApi = createDetectionsApi(apiClient);

    await detectionsApi.readRule({ query: { id: 'rule-1' } });

    const [, options] = apiClient.get.mock.calls[0];

    expect(options).toMatchObject({
      responseType: 'json',
      headers: {
        'kbn-xsrf': 'true',
        [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    });
  });

  it('merges caller headers over the defaults and prefixes the Kibana space', async () => {
    const apiClient = createApiClientMock();
    const detectionsApi = createDetectionsApi(apiClient);
    const authorization = 'ApiKey secret';

    await detectionsApi.readRule(
      { query: { id: 'rule-1' } },
      { headers: { Authorization: authorization }, kibanaSpace: 'space-a' }
    );

    const [url, options] = apiClient.get.mock.calls[0];
    const { pathname } = parseRequestUrl(url);

    expect(pathname).toBe('/s/space-a/api/detection_engine/rules');
    expect(options?.headers).toMatchObject({
      Authorization: authorization,
      'kbn-xsrf': 'true',
    });
  });

  it('treats the default space as no prefix', async () => {
    const apiClient = createApiClientMock();
    const detectionsApi = createDetectionsApi(apiClient);

    await detectionsApi.readRule({ query: { id: 'rule-1' } }, { kibanaSpace: 'default' });

    const [url] = apiClient.get.mock.calls[0];

    expect(parseRequestUrl(url).pathname).toBe('/api/detection_engine/rules');
  });
});
