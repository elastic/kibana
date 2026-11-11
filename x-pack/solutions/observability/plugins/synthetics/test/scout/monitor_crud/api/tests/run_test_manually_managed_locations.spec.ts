/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { KibanaRole } from '@kbn/scout-oblt';
import {
  apiTest,
  KIBANA_HEADERS,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_API_URLS,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import {
  enableSynthetics,
  saveMonitorInternal,
  testNowMonitor,
} from '../../../common/fixtures/monitors';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';

const ELASTIC_MANAGED_LOCATIONS_DISABLED =
  "You don't have permission to use Elastic managed global locations. Please contact your Kibana administrator.";

const ROLE_CONFIGS = {
  SYNTHETICS_ALL: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['all'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['all'] } }],
  },
  SYNTHETICS_READ_WITH_RUN: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['read'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['read', 'can_run_test_manually'] } }],
  },
  // Writer whose admin turned off the `elastic_managed_locations_enabled` sub-feature.
  SYNTHETICS_ALL_WITHOUT_MANAGED_LOCATIONS: {
    elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['all'] }] },
    kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['minimal_all'] } }],
  },
} satisfies Record<string, KibanaRole>;

/**
 * Manual runs on Elastic managed locations also require the `elastic_managed_locations_enabled`
 * sub-feature, matching the UI, which disables "Run test manually" for such monitors without it.
 * Monitors on private locations only are not affected.
 */
apiTest.describe(
  'RunTestManuallyPermissions - Elastic managed locations',
  { tag: ['@local-stateful-classic'] },
  () => {
    let allHeaders: Record<string, string>;
    let readWithRunHeaders: Record<string, string>;
    let allWithoutManagedLocationsHeaders: Record<string, string>;
    let managedMonitor: Record<string, unknown>;
    let privateMonitorId: string;

    apiTest.beforeAll(async ({ requestAuth, samlAuth, apiClient, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });

      const resolve = async (role: KibanaRole) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
        return mergeSyntheticsApiHeaders(apiKeyHeader);
      };
      allHeaders = await resolve(ROLE_CONFIGS.SYNTHETICS_ALL);
      readWithRunHeaders = await resolve(ROLE_CONFIGS.SYNTHETICS_READ_WITH_RUN);
      allWithoutManagedLocationsHeaders = await resolve(
        ROLE_CONFIGS.SYNTHETICS_ALL_WITHOUT_MANAGED_LOCATIONS
      );

      // Enabling synthetics creates a nested service api key, which fails under
      // api-key auth, so use an interactive admin (cookie) session instead.
      const { cookieHeader: adminCookie } = await samlAuth.asInteractiveUser('admin');
      const adminHeaders = { ...KIBANA_HEADERS, ...adminCookie };
      await enableSynthetics(apiClient, adminHeaders);

      const privateLocation =
        await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
      const managedRes = await saveMonitorInternal(apiClient, adminHeaders, {
        ...httpMonitorFixture,
        name: `managed location monitor ${uuidv4()}`,
        locations: [LOCAL_PUBLIC_LOCATION],
      });
      const { created_at: createdAt, updated_at: updatedAt, ...managedBody } = managedRes.body;
      managedMonitor = managedBody;
      const privateRes = await saveMonitorInternal(apiClient, adminHeaders, {
        ...httpMonitorFixture,
        name: `private location monitor ${uuidv4()}`,
        locations: [privateLocation],
      });
      privateMonitorId = (privateRes.body as { id: string }).id;
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest(
      'read + can_run_test_manually role cannot run a monitor on managed locations (403)',
      async ({ apiClient }) => {
        const res = await testNowMonitor(
          apiClient,
          readWithRunHeaders,
          managedMonitor.id as string,
          { statusCode: 403 }
        );
        expect((res.body as { message: string }).message).toBe(ELASTIC_MANAGED_LOCATIONS_DISABLED);
      }
    );

    apiTest(
      'read + can_run_test_manually role can run a private-location-only monitor',
      async ({ apiClient }) => {
        const res = await testNowMonitor(apiClient, readWithRunHeaders, privateMonitorId);
        expect(typeof (res.body as { testRunId: string }).testRunId).toBe('string');
      }
    );

    apiTest(
      'writer without the managed locations sub-feature cannot run it (403)',
      async ({ apiClient }) => {
        const res = await testNowMonitor(
          apiClient,
          allWithoutManagedLocationsHeaders,
          managedMonitor.id as string,
          { statusCode: 403 }
        );
        expect((res.body as { message: string }).message).toBe(ELASTIC_MANAGED_LOCATIONS_DISABLED);
      }
    );

    apiTest('base `all` role can run a monitor on managed locations', async ({ apiClient }) => {
      const res = await testNowMonitor(apiClient, allHeaders, managedMonitor.id as string);
      expect(typeof (res.body as { testRunId: string }).testRunId).toBe('string');
    });

    apiTest(
      'run once (monitor editor) is also gated on managed locations',
      async ({ apiClient }) => {
        const runOncePath = `${SYNTHETICS_API_URLS.RUN_ONCE_MONITOR}/${uuidv4()}`;
        const denied = await apiClient.post(runOncePath, {
          headers: allWithoutManagedLocationsHeaders,
          body: managedMonitor,
          responseType: 'json',
        });
        expect(denied).toHaveStatusCode(403);
        expect((denied.body as { message: string }).message).toBe(
          ELASTIC_MANAGED_LOCATIONS_DISABLED
        );

        const allowed = await apiClient.post(runOncePath, {
          headers: allHeaders,
          body: managedMonitor,
          responseType: 'json',
        });
        expect(allowed).toHaveStatusCode(200);
      }
    );
  }
);
