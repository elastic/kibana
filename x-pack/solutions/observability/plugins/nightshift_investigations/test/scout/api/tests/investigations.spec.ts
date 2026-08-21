/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { apiTest, COMMON_HEADERS } from '../fixtures';

const INVESTIGATIONS_PATH = 'internal/nightshift/investigations';

apiTest.describe(
  'Nightshift Investigations API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.describe('GET /internal/nightshift/investigations', () => {
      apiTest('returns 200 with a paginated result shape', async ({ apiClient }) => {
        const response = await apiClient.get(INVESTIGATIONS_PATH, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({
          results: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          size: expect.any(Number),
        });
      });

      apiTest('returns 400 when page exceeds the maximum of 100', async ({ apiClient }) => {
        const response = await apiClient.get(`${INVESTIGATIONS_PATH}?page=101`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });

      apiTest('returns 400 for an unrecognised status value', async ({ apiClient }) => {
        const response = await apiClient.get(`${INVESTIGATIONS_PATH}?statuses=not_a_status`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });

      apiTest('returns 400 for an invalid sort_field value', async ({ apiClient }) => {
        const response = await apiClient.get(`${INVESTIGATIONS_PATH}?sort_field=unknown_field`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });
    });

    apiTest.describe('GET /internal/nightshift/investigations/{id}', () => {
      apiTest('returns 404 for a non-existent investigation id', async ({ apiClient }) => {
        const response = await apiClient.get(`${INVESTIGATIONS_PATH}/non-existent-id`, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
      });
    });

    apiTest.describe('POST /internal/nightshift/investigations', () => {
      apiTest('returns 400 when the request body is empty', async ({ apiClient }) => {
        const response = await apiClient.post(INVESTIGATIONS_PATH, {
          headers: adminHeaders,
          body: {},
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });

      apiTest('returns 400 for an invalid subject type', async ({ apiClient }) => {
        const response = await apiClient.post(INVESTIGATIONS_PATH, {
          headers: adminHeaders,
          body: { subject: { type: 'not_a_valid_type', id: 'some-id' } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });

      apiTest('returns 400 when subject.id exceeds 500 characters', async ({ apiClient }) => {
        const response = await apiClient.post(INVESTIGATIONS_PATH, {
          headers: adminHeaders,
          body: { subject: { type: 'alert', id: 'x'.repeat(501) } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      });
    });
  }
);
