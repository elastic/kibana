/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { INTERNAL_HEADERS, THIRD_PARTY_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface IncompatibleFieldItem {
  fieldName: string;
  expectedValue?: string;
  actualValue?: string;
  description?: string;
}

interface DataQualityResult {
  indexName: string;
  batchId?: string;
  isCheckAll?: boolean;
  checkedAt?: number;
  docsCount?: number;
  totalFieldCount?: number;
  ecsFieldCount?: number;
  customFieldCount?: number;
  incompatibleFieldCount: number;
  incompatibleFieldMappingItems?: IncompatibleFieldItem[];
  incompatibleFieldValueItems?: IncompatibleFieldItem[];
  sameFamilyFieldCount?: number;
  sameFamilyFields?: string[];
  sizeInBytes?: number;
  ecsVersion?: string;
  error?: string | null;
}

/**
 * Third-Party API Contract Tests: ECS Data Quality Dashboard
 *
 * These tests verify that the ECS Data Quality Dashboard API returns the expected structure
 * that SIEM Readiness depends on. If ECS Data Quality team changes their API,
 * these tests will fail and alert us before production breaks.
 *
 * SIEM Readiness uses this API for:
 * - Quality tab to show ECS compatibility status
 * - Determining if indices have incompatible fields
 * - Showing field count statistics
 */
apiTest.describe(
  'Third-Party API Contract - ECS Data Quality Dashboard',
  { tag: SIEM_READINESS_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...INTERNAL_HEADERS,
      };
    });

    apiTest(
      'GET /internal/ecs_data_quality_dashboard/results_latest/* returns array',
      async ({ apiClient }) => {
        // Use a wildcard pattern that might match some indices
        const response = await apiClient.get(
          `${THIRD_PARTY_ROUTES.ECS_DATA_QUALITY_LATEST}/logs-*`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(200);

        // Response must be an array (even if empty)
        expect(Array.isArray(response.body)).toBe(true);
      }
    );

    apiTest(
      'results have required fields for SIEM Readiness Quality tab',
      async ({ apiClient }) => {
        // First try to get any existing results
        const response = await apiClient.get(`${THIRD_PARTY_ROUTES.ECS_DATA_QUALITY_LATEST}/*`, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);

        // If there are results, verify their structure
        if (response.body.length > 0) {
          response.body.forEach((result: DataQualityResult) => {
            // indexName is required - used to identify which index was checked
            expect(result.indexName).toBeDefined();
            expect(typeof result.indexName).toBe('string');

            // incompatibleFieldCount is critical - used to determine if index has issues
            expect(result.incompatibleFieldCount).toBeDefined();
            expect(typeof result.incompatibleFieldCount).toBe('number');
            expect(result.incompatibleFieldCount).toBeGreaterThanOrEqual(0);
          });
        }
      }
    );

    apiTest('results with field counts have numeric values', async ({ apiClient }) => {
      const response = await apiClient.get(`${THIRD_PARTY_ROUTES.ECS_DATA_QUALITY_LATEST}/*`, {
        headers: defaultHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      // If there are results with field counts, verify they're numbers
      response.body.forEach((result: DataQualityResult) => {
        // These fields are used to show statistics in SIEM Readiness
        if (result.ecsFieldCount !== undefined) {
          expect(typeof result.ecsFieldCount).toBe('number');
          expect(result.ecsFieldCount).toBeGreaterThanOrEqual(0);
        }

        if (result.customFieldCount !== undefined) {
          expect(typeof result.customFieldCount).toBe('number');
          expect(result.customFieldCount).toBeGreaterThanOrEqual(0);
        }

        if (result.totalFieldCount !== undefined) {
          expect(typeof result.totalFieldCount).toBe('number');
          expect(result.totalFieldCount).toBeGreaterThanOrEqual(0);
        }

        if (result.docsCount !== undefined) {
          expect(typeof result.docsCount).toBe('number');
          expect(result.docsCount).toBeGreaterThanOrEqual(0);
        }
      });
    });

    apiTest(
      'results with incompatible field items have expected structure',
      async ({ apiClient }) => {
        const response = await apiClient.get(`${THIRD_PARTY_ROUTES.ECS_DATA_QUALITY_LATEST}/*`, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);

        // Find results that have incompatible field details
        const resultsWithIncompatible = response.body.filter(
          (result: DataQualityResult) =>
            result.incompatibleFieldMappingItems !== undefined &&
            result.incompatibleFieldMappingItems.length > 0
        );

        resultsWithIncompatible.forEach((result: DataQualityResult) => {
          result.incompatibleFieldMappingItems!.forEach((item: IncompatibleFieldItem) => {
            // fieldName is required for displaying which field has issues
            expect(item.fieldName).toBeDefined();
            expect(typeof item.fieldName).toBe('string');
          });
        });
      }
    );

    apiTest('results can have error field for failed checks', async ({ apiClient }) => {
      const response = await apiClient.get(`${THIRD_PARTY_ROUTES.ECS_DATA_QUALITY_LATEST}/*`, {
        headers: defaultHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      // If there are results with errors, verify error is string or null
      response.body.forEach((result: DataQualityResult) => {
        if (result.error !== undefined) {
          expect(result.error === null || typeof result.error === 'string').toBe(true);
        }
      });
    });
  }
);
