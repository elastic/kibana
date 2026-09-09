/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { KibanaRole } from '@kbn/scout-oblt';
import { apiTest, mergeSyntheticsApiHeaders } from '../../../common/fixtures';
import { testNowMonitor } from '../../../common/fixtures/monitors';

/**
 * "Run test manually" (`POST /api/synthetics/monitor/test/{monitorId}`) is gated by an
 * OR-set: `uptime-read` AND (`uptime-write` OR `monitor-run-manually`). This verifies:
 *  - a plain `read` role is rejected (403) — no change from today,
 *  - a `read` role WITH the `can_run_test_manually` sub-feature is authorized (not 403),
 *  - a base `all` role is still authorized via `uptime-write` (non-breaking),
 *  - a user with no Synthetics access is rejected.
 *
 * We hit a non-existent monitor id, so an authorized request resolves past the authz
 * layer to a 404 (monitor not found) rather than 403 — the authz boundary is what we assert.
 */
const ROLE_CONFIGS = {
  SYNTHETICS_ALL: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['all'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['all'] } }],
  },
  SYNTHETICS_READ_ONLY: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['read'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['read'] } }],
  },
  SYNTHETICS_READ_WITH_RUN: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['read'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['read', 'can_run_test_manually'] } }],
  },
  NO_SYNTHETICS: {
    elasticsearch: { cluster: [], indices: [{ names: ['log-*'], privileges: ['read'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { dashboard: ['read'] } }],
  },
} satisfies Record<string, KibanaRole>;

apiTest.describe('RunTestManuallyPermissions', { tag: ['@local-stateful-classic'] }, () => {
  let allHeaders: Record<string, string>;
  let readOnlyHeaders: Record<string, string>;
  let readWithRunHeaders: Record<string, string>;
  let noSyntheticsHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const resolve = async (role: KibanaRole) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
      return mergeSyntheticsApiHeaders(apiKeyHeader);
    };
    allHeaders = await resolve(ROLE_CONFIGS.SYNTHETICS_ALL);
    readOnlyHeaders = await resolve(ROLE_CONFIGS.SYNTHETICS_READ_ONLY);
    readWithRunHeaders = await resolve(ROLE_CONFIGS.SYNTHETICS_READ_WITH_RUN);
    noSyntheticsHeaders = await resolve(ROLE_CONFIGS.NO_SYNTHETICS);
  });

  apiTest('read-only role cannot run tests (403)', async ({ apiClient }) => {
    const res = await testNowMonitor(apiClient, readOnlyHeaders, uuidv4(), { statusCode: 403 });
    expect(decodeURIComponent((res.body as { message?: string }).message ?? '')).toContain(
      '[uptime-write,monitor-run-manually]'
    );
  });

  apiTest('user with no Synthetics access cannot run tests (403)', async ({ apiClient }) => {
    await testNowMonitor(apiClient, noSyntheticsHeaders, uuidv4(), { statusCode: 403 });
  });

  apiTest('read + can_run_test_manually role is authorized to run tests', async ({ apiClient }) => {
    // Passes authz; the dummy monitor does not exist → 404, not 403.
    await testNowMonitor(apiClient, readWithRunHeaders, uuidv4(), { statusCode: 404 });
  });

  apiTest(
    'base `all` role is still authorized to run tests (non-breaking)',
    async ({ apiClient }) => {
      await testNowMonitor(apiClient, allHeaders, uuidv4(), { statusCode: 404 });
    }
  );
});
