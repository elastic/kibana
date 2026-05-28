/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { INTERNAL_HEADERS, THIRD_PARTY_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface CasesSearchResponse {
  total: number;
  count_open_cases: number;
  count_closed_cases: number;
  count_in_progress_cases: number;
}

/**
 * Third-Party API Contract Tests: Cases API
 *
 * These tests verify that the Cases API returns the expected structure
 * that SIEM Readiness depends on. If Cases team changes their API,
 * these tests will fail and alert us before production breaks.
 *
 * SIEM Readiness uses this API for:
 * - Displaying case statistics in the Continuity tab
 * - Showing open, closed, and in-progress case counts
 */
apiTest.describe('Third-Party API Contract - Cases API', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
  });

  apiTest('POST /internal/cases/_search returns expected structure', async ({ apiClient }) => {
    const response = await apiClient.post(THIRD_PARTY_ROUTES.CASES_SEARCH, {
      headers: defaultHeaders,
      body: { owner: ['securitySolution'] },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    // Response must have required count fields
    const body = response.body as CasesSearchResponse;

    expect(body.total).toBeDefined();
    expect(body.count_open_cases).toBeDefined();
    expect(body.count_closed_cases).toBeDefined();
    expect(body.count_in_progress_cases).toBeDefined();
  });

  apiTest('case count fields are numeric and non-negative', async ({ apiClient }) => {
    const response = await apiClient.post(THIRD_PARTY_ROUTES.CASES_SEARCH, {
      headers: defaultHeaders,
      body: { owner: ['securitySolution'] },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CasesSearchResponse;

    // total must be a non-negative number
    expect(typeof body.total).toBe('number');
    expect(body.total).toBeGreaterThanOrEqual(0);

    // count_open_cases must be a non-negative number
    expect(typeof body.count_open_cases).toBe('number');
    expect(body.count_open_cases).toBeGreaterThanOrEqual(0);

    // count_closed_cases must be a non-negative number
    expect(typeof body.count_closed_cases).toBe('number');
    expect(body.count_closed_cases).toBeGreaterThanOrEqual(0);

    // count_in_progress_cases must be a non-negative number
    expect(typeof body.count_in_progress_cases).toBe('number');
    expect(body.count_in_progress_cases).toBeGreaterThanOrEqual(0);
  });

  apiTest('case counts are consistent (sum of statuses <= total)', async ({ apiClient }) => {
    const response = await apiClient.post(THIRD_PARTY_ROUTES.CASES_SEARCH, {
      headers: defaultHeaders,
      body: { owner: ['securitySolution'] },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CasesSearchResponse;

    // The sum of status counts should be less than or equal to total
    // (less than if there are other statuses we don't track)
    const statusSum =
      body.count_open_cases + body.count_closed_cases + body.count_in_progress_cases;
    expect(statusSum).toBeLessThanOrEqual(body.total);
  });

  apiTest('search with owner filter returns same structure', async ({ apiClient }) => {
    // SIEM Readiness may filter by owner (securitySolution)
    const response = await apiClient.post(THIRD_PARTY_ROUTES.CASES_SEARCH, {
      headers: defaultHeaders,
      body: {
        owner: ['securitySolution'],
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CasesSearchResponse;

    // Same structure should be returned with owner filter
    expect(body.total).toBeDefined();
    expect(body.count_open_cases).toBeDefined();
    expect(body.count_closed_cases).toBeDefined();
    expect(body.count_in_progress_cases).toBeDefined();

    expect(typeof body.total).toBe('number');
    expect(typeof body.count_open_cases).toBe('number');
    expect(typeof body.count_closed_cases).toBe('number');
    expect(typeof body.count_in_progress_cases).toBe('number');
  });
});
