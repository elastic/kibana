/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  SIEM_READINESS_ROUTES,
  SIEM_READINESS_TAGS,
  SIEM_READINESS_ES_ARCHIVE,
} from '../../fixtures';

interface IndexInfo {
  indexName: string;
  docs: number;
}

interface CategoryGroup {
  category: string;
  indices: IndexInfo[];
}

interface CategoriesResponse {
  rawCategoriesMap: CategoryGroup[];
  mainCategoriesMap: CategoryGroup[];
}

/**
 * SIEM Readiness API Tests: Categories Endpoint
 *
 * Tests for GET /api/siem_readiness/get_categories
 * This endpoint aggregates event.category values across indices
 * and groups them into main categories for the Coverage tab.
 */
apiTest.describe('SIEM Readiness - Categories API', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    // Load test data with various event.category values
    await esArchiver.loadIfNeeded(SIEM_READINESS_ES_ARCHIVE);
  });

  apiTest('returns 200 with expected response structure', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_CATEGORIES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CategoriesResponse;

    // Response must have both category maps
    expect(body.rawCategoriesMap).toBeDefined();
    expect(body.mainCategoriesMap).toBeDefined();

    expect(Array.isArray(body.rawCategoriesMap)).toBe(true);
    expect(Array.isArray(body.mainCategoriesMap)).toBe(true);
  });

  apiTest('rawCategoriesMap contains category groups with indices', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_CATEGORIES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CategoriesResponse;

    // Each raw category group should have expected structure
    body.rawCategoriesMap.forEach((group: CategoryGroup) => {
      expect(group.category).toBeDefined();
      expect(typeof group.category).toBe('string');

      expect(group.indices).toBeDefined();
      expect(Array.isArray(group.indices)).toBe(true);

      group.indices.forEach((indexInfo: IndexInfo) => {
        expect(indexInfo.indexName).toBeDefined();
        expect(typeof indexInfo.indexName).toBe('string');

        expect(indexInfo.docs).toBeDefined();
        expect(typeof indexInfo.docs).toBe('number');
        expect(indexInfo.docs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  apiTest('mainCategoriesMap groups into 5 main categories', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_CATEGORIES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CategoriesResponse;

    // Main categories should only contain these 5 categories
    const validMainCategories = ['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'];

    body.mainCategoriesMap.forEach((group: CategoryGroup) => {
      expect(validMainCategories).toContain(group.category);

      expect(group.indices).toBeDefined();
      expect(Array.isArray(group.indices)).toBe(true);
    });
  });

  apiTest('document counts are non-negative integers', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_CATEGORIES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as CategoriesResponse;

    // All doc counts should be non-negative
    [...body.rawCategoriesMap, ...body.mainCategoriesMap].forEach((group: CategoryGroup) => {
      group.indices.forEach((indexInfo: IndexInfo) => {
        expect(Number.isInteger(indexInfo.docs)).toBe(true);
        expect(indexInfo.docs).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
