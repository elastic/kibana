/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { addMonitor, deleteMonitors } from '../../../common/fixtures/monitors';
import {
  getPackagePolicyForMonitor,
  setPackagePolicyCondition,
} from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';

/** Matches `agentIdCondition()`; CI has no enrolled agents, so we seed this leftover pin. */
const SEEDED_PIN = "${agent.id} == 'seeded-agent'";

/**
 * Disabling `isAgentSharding` must rewrite monitors *before* the location SO
 * flips, so a leftover `${agent.id}` pin is cleared rather than left behind
 * on a now-classic location. CI never enrolls an agent, so create omits the
 * pin; this spec stamps one via Fleet then turns sharding off.
 */
apiTest.describe(
  'DisableScalablePrivateLocation',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient }) => {
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey);
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey);

      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
    });

    apiTest(
      'disabling sharding clears a leftover agent pin before the location is persisted',
      async ({ apiClient, apiServices }) => {
        const location = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(
          'default',
          { isAgentSharding: true }
        );
        const res = await addMonitor(apiClient, editorHeaders, {
          ...httpMonitorFixture,
          locations: [location],
          name: `Disable sharding monitor ${uuidv4()}`,
          namespace: 'default',
        });
        const monitorId = (res.body as { id: string }).id;

        try {
          await tryForTime(30_000, async () => {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              location.id
            );
            expect(policy).toBeDefined();
          });

          const seeded = await setPackagePolicyCondition(
            apiClient,
            adminHeaders,
            `${monitorId}-${location.id}`,
            SEEDED_PIN
          );
          expect(seeded.condition).toBe(SEEDED_PIN);

          const editRes = await apiClient.put(`api/synthetics/private_locations/${location.id}`, {
            headers: editorHeaders,
            body: { isAgentSharding: false },
            responseType: 'json',
          });
          expect(editRes).toHaveStatusCode(200);
          expect((editRes.body as { isAgentSharding?: boolean }).isAgentSharding).not.toBe(true);

          const fetched = await apiClient.get(`api/synthetics/private_locations/${location.id}`, {
            headers: editorHeaders,
            responseType: 'json',
          });
          expect(fetched).toHaveStatusCode(200);
          expect((fetched.body as { isAgentSharding?: boolean }).isAgentSharding).not.toBe(true);

          await tryForTime(30_000, async () => {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              location.id
            );
            expect(policy).toBeDefined();
            expect(policy?.condition == null).toBe(true);
          });
        } finally {
          await deleteMonitors(apiClient, editorHeaders, [monitorId], { spaceId: 'default' });
        }
      }
    );
  }
);
