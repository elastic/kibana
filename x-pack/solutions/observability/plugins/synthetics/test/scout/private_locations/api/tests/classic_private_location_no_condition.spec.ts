/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { addMonitor, editMonitor, deleteMonitors } from '../../../common/fixtures/monitors';
import { getPackagePolicyForMonitor } from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';

/**
 * Regression guard for the condition-sharding feature: a classic (non
 * `isAgentSharding`) private location must never get a `condition` stamped on
 * its package policies, on create *or* edit. `synthetics_private_location.ts`
 * gates the whole `condition` write behind `isConditionShardedLocation`, but
 * no existing suite ever asserted the negative -- every other private-location
 * spec that touches a classic location happens to never look at `condition`
 * at all, so a regression there would ship silently.
 */
apiTest.describe(
  'ClassicPrivateLocationNoCondition',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    let privateLocation: ScoutPrivateLocation;

    apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient }) => {
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey);
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey);

      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();
      privateLocation = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(
        'default'
      );
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
    });

    apiTest(
      'never stamps a condition on a classic private location, on create or edit',
      async ({ apiClient }) => {
        const res = await addMonitor(apiClient, editorHeaders, {
          ...httpMonitorFixture,
          locations: [privateLocation],
          name: `Classic location monitor ${uuidv4()}`,
          namespace: 'default',
        });
        const monitorId = (res.body as { id: string }).id;

        try {
          await tryForTime(30_000, async () => {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              privateLocation.id
            );
            expect(policy, 'package policy should exist after create').toBeDefined();
            expect(policy?.condition ?? null).toBeNull();
          });

          await editMonitor(apiClient, editorHeaders, monitorId, {
            ...httpMonitorFixture,
            locations: [privateLocation],
            name: `Classic location monitor ${uuidv4()} (edited)`,
            namespace: 'default',
            schedule: { number: '10', unit: 'm' },
          });

          await tryForTime(30_000, async () => {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              privateLocation.id
            );
            expect(policy, 'package policy should still exist after edit').toBeDefined();
            expect(policy?.condition ?? null).toBeNull();
          });
        } finally {
          await deleteMonitors(apiClient, editorHeaders, [monitorId], { spaceId: 'default' });
        }
      }
    );
  }
);
