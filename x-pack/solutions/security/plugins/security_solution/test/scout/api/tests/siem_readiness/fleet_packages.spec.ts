/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, THIRD_PARTY_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

/**
 * Third-Party API Contract Tests: Fleet Packages
 *
 * These tests verify that the Fleet API returns the expected structure
 * that SIEM Readiness depends on. If Fleet team changes their API,
 * these tests will fail and alert us before production breaks.
 *
 * SIEM Readiness uses this API for:
 * - Integration coverage (Coverage tab)
 * - Determining enabled vs disabled integrations via packagePoliciesInfo.count
 */
apiTest.describe('Third-Party API Contract - Fleet Packages', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest('GET /api/fleet/epm/packages returns expected structure', async ({ apiClient }) => {
    const response = await apiClient.get(THIRD_PARTY_ROUTES.FLEET_PACKAGES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    // Response must have items array
    expect(response.body.items).toBeDefined();
    expect(Array.isArray(response.body.items)).toBe(true);
  });

  apiTest('packages have required fields that SIEM Readiness depends on', async ({ apiClient }) => {
    const response = await apiClient.get(THIRD_PARTY_ROUTES.FLEET_PACKAGES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    interface FleetPackage {
      id: string;
      name: string;
      title: string;
      version: string;
      status: string;
    }

    // Verify structure of each package (forEach on empty array is a no-op)
    response.body.items.forEach((pkg: FleetPackage) => {
      // Required fields for SIEM Readiness integration mapping
      expect(pkg.id).toBeDefined();
      expect(typeof pkg.id).toBe('string');

      expect(pkg.name).toBeDefined();
      expect(typeof pkg.name).toBe('string');

      expect(pkg.title).toBeDefined();
      expect(typeof pkg.title).toBe('string');

      expect(pkg.version).toBeDefined();
      expect(typeof pkg.version).toBe('string');

      expect(pkg.status).toBeDefined();
      expect(typeof pkg.status).toBe('string');
      // Valid statuses that SIEM Readiness expects
      expect(['installed', 'not_installed', 'installing', 'install_failed']).toContain(pkg.status);
    });
  });

  apiTest(
    'installed packages have packagePoliciesInfo for enabled/disabled detection',
    async ({ apiClient }) => {
      const response = await apiClient.get(THIRD_PARTY_ROUTES.FLEET_PACKAGES, {
        headers: defaultHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      // Find installed packages that have packagePoliciesInfo
      // SIEM Readiness uses packagePoliciesInfo.count to determine:
      // - count > 0 = enabled integration
      // - count = 0 = disabled integration (installed but no policies)
      const installedWithPolicies = response.body.items.filter(
        (pkg: { status: string; packagePoliciesInfo?: { count?: number } }) =>
          pkg.status === 'installed' && pkg.packagePoliciesInfo !== undefined
      );

      installedWithPolicies.forEach((pkg: { packagePoliciesInfo: { count?: number } }) => {
        expect(pkg.packagePoliciesInfo.count).toBeDefined();
        expect(typeof pkg.packagePoliciesInfo.count).toBe('number');
        expect(pkg.packagePoliciesInfo.count).toBeGreaterThanOrEqual(0);
      });
    }
  );

  apiTest('packages with categories have string array format', async ({ apiClient }) => {
    const response = await apiClient.get(THIRD_PARTY_ROUTES.FLEET_PACKAGES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    // Check packages that have categories
    const packagesWithCategories = response.body.items.filter(
      (pkg: { categories?: string[] }) => pkg.categories !== undefined
    );

    packagesWithCategories.forEach((pkg: { categories: string[] }) => {
      expect(Array.isArray(pkg.categories)).toBe(true);
      pkg.categories.forEach((category: string) => {
        expect(typeof category).toBe('string');
      });
    });
  });
});
