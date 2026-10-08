/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization of the SLO CRUD routes request-validation behavior, ahead of
 * the io-ts to zod migration. Only status codes and the presence of the offending
 * field in the error message are asserted: exact message text is not part of the
 * API contract and is expected to change with the migration.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, mergeSloApiHeaders, sloApiPathWithQuery } from '../../fixtures';

const VALID_UNKNOWN_ID = 'some-unknown-slo-id';

apiTest.describe(
  'SLO CRUD request validation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    const getErrorMessage = (body: unknown): string =>
      String((body as { message?: unknown }).message ?? '');

    apiTest('create: returns 400 on an invalid time window duration', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: { ...DEFAULT_SLO, timeWindow: { duration: '0d', type: 'rolling' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('duration');
    });

    apiTest('create: returns 400 on an invalid custom id', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: { ...DEFAULT_SLO, id: 'UPPERCASE' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toMatch(/slo id/i);
    });

    apiTest('create: returns 400 on a missing required field', async ({ apiClient }) => {
      const { indicator, ...bodyWithoutIndicator } = DEFAULT_SLO;
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: bodyWithoutIndicator,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('indicator');
    });

    apiTest('create: returns 400 on an unknown body key', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: { ...DEFAULT_SLO, unknownKey: 'unexpected' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('unknownKey');
    });

    apiTest('update: returns 400 on an invalid path id', async ({ apiClient }) => {
      const response = await apiClient.put('api/observability/slos/UPPERCASE', {
        headers,
        body: { name: 'new name' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toMatch(/slo id/i);
    });

    apiTest('update: returns 400 on an unknown body key', async ({ apiClient }) => {
      const response = await apiClient.put(`api/observability/slos/${VALID_UNKNOWN_ID}`, {
        headers,
        body: { unknownKey: 'unexpected' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('unknownKey');
    });

    apiTest('get returns 400 on an invalid path id', async ({ apiClient }) => {
      const response = await apiClient.get('api/observability/slos/UPPERCASE', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toMatch(/slo id/i);
    });

    apiTest('delete returns 400 on an invalid path id', async ({ apiClient }) => {
      const response = await apiClient.delete('api/observability/slos/UPPERCASE', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toMatch(/slo id/i);
    });

    apiTest('find: returns 400 on an invalid searchAfter value', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos', { searchAfter: 'not-a-json-array' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('searchAfter');
    });

    apiTest('find: returns 400 on an unknown sortBy value', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos', { sortBy: 'bogus' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('sortBy');
    });

    apiTest('find: returns 400 on an unknown query key', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos', { unknownKey: 'unexpected' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(400);
      expect(getErrorMessage(response.body)).toContain('unknownKey');
    });

    apiTest('find: accepts hideStale as a boolean string', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos', { hideStale: 'true' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest('find: accepts a valid searchAfter JSON array', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos', {
          searchAfter: JSON.stringify(['cursor', 42]),
          size: 10,
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
    });
  }
);
