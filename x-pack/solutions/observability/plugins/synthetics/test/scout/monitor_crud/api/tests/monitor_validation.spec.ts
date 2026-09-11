/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { addMonitor } from '../../../common/fixtures/monitors';

/**
 * Black-box characterization of the `POST /api/synthetics/monitors` request
 * validation, pinning the HTTP contract before the io-ts → zod migration.
 *
 * The monitor-create path validates the body in the route *handler* today
 * (`schema.any()` body + io-ts `validateMonitor`). Phase 4 of the migration
 * moves this to route-level zod validation, so these tests assert the parts
 * that must not change: a malformed field yields `400` (never `500`) with an
 * error body, while the same payload with the field corrected is accepted.
 * Assertions stay on status codes and message presence — exact wording will
 * change when validation moves to the platform router and is intentionally not
 * pinned here (matching the SLO migration's approach).
 */
apiTest.describe(
  'AddMonitorPublicAPI request validation',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;

    const baseHttpMonitor = () => ({
      type: 'http',
      url: 'https://www.elastic.co',
      locations: [LOCAL_PUBLIC_LOCATION.id],
    });

    const expectRejected = async (
      apiClient: Parameters<typeof addMonitor>[0],
      payload: Record<string, unknown>
    ) => {
      const res = await addMonitor(apiClient, editorHeaders, payload, { statusCode: 400 });
      const body = res.body as { message?: string; attributes?: { details?: string } };
      // A validation failure must surface an explanatory message, not an opaque 500.
      expect(typeof body.message).toBe('string');
      expect(body.message!.length).toBeGreaterThan(0);
    };

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest('accepts the base monitor the negative cases mutate', async ({ apiClient }) => {
      await addMonitor(apiClient, editorHeaders, baseHttpMonitor(), { statusCode: 200 });
    });

    apiTest('rejects an unknown monitor type', async ({ apiClient }) => {
      await expectRejected(apiClient, { ...baseHttpMonitor(), type: 'not-a-monitor-type' });
    });

    apiTest('rejects a monitor with no locations', async ({ apiClient }) => {
      await expectRejected(apiClient, { ...baseHttpMonitor(), locations: [] });
    });

    apiTest('rejects an unknown top-level field', async ({ apiClient }) => {
      await expectRejected(apiClient, { ...baseHttpMonitor(), not_a_real_monitor_key: true });
    });

    apiTest('rejects an invalid namespace', async ({ apiClient }) => {
      await expectRejected(apiClient, { ...baseHttpMonitor(), namespace: 'Invalid Namespace' });
    });

    apiTest('rejects a schedule outside the allowed set', async ({ apiClient }) => {
      await expectRejected(apiClient, {
        ...baseHttpMonitor(),
        schedule: { number: '4', unit: 'm' },
      });
    });
  }
);
