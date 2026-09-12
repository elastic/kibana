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
import { getPackagePolicyForMonitor, getAgentPolicyRevision } from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';

/**
 * A scalable (condition-sharded) private location -- `isAgentSharding: true`
 * -- routes every write through `PackagePolicyService`'s batched Fleet
 * agent-policy revision bump (`agent_policy_revision_batcher.ts`), unlike a
 * classic private location, which goes through Fleet's own immediate bump.
 * No existing Scout or FTR suite set `isAgentSharding: true` on a private
 * location, so that whole path -- create, update, and delete -- ran with zero
 * real-HTTP, real-auth coverage.
 *
 * That gap is not hypothetical: `bumpAgentPolicyRevision` briefly resolved its
 * cross-space agent-policy lookup with `getUnsafeInternalClient()`, which
 * attaches Kibana core's spaces extension backed by a synthetic, headerless
 * request. Resolving the `*` (all-spaces) namespace through that extension
 * issued a real Elasticsearch `_security/user/_has_privileges` call with no
 * credentials attached, and a real, security-enabled Elasticsearch correctly
 * rejected it -- failing every scalable-location monitor create/update/delete
 * outright with a 500. Every Jest unit test in that PR mocked `getByIds` and
 * never touched Elasticsearch's real security layer, so none of them caught
 * it; it only surfaced against a real, authenticated stack.
 */
apiTest.describe(
  'ScalablePrivateLocationMonitorCrud',
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
        'default',
        { isAgentSharding: true }
      );
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
    });

    apiTest(
      'creates, updates, and deletes a monitor against a scalable private location',
      async ({ apiClient }) => {
        const res = await addMonitor(apiClient, editorHeaders, {
          ...httpMonitorFixture,
          locations: [privateLocation],
          name: `Scalable location monitor ${uuidv4()}`,
          namespace: 'default',
        });
        const monitorId = (res.body as { id: string }).id;

        try {
          // The package policy is written synchronously. CI locations have no
          // enrolled agents, so we omit `${agent.id}` rather than pin to a
          // sentinel; existence of the policy is what proves the batched
          // create path ran.
          await tryForTime(30_000, async () => {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              privateLocation.id
            );
            expect(policy).toBeDefined();
            expect(policy?.condition).toBeUndefined();
          });

          const revisionBeforeEdit = await getAgentPolicyRevision(
            apiClient,
            adminHeaders,
            privateLocation.agentPolicyId
          );

          await editMonitor(apiClient, editorHeaders, monitorId, {
            ...httpMonitorFixture,
            locations: [privateLocation],
            name: `Scalable location monitor ${uuidv4()} (edited)`,
            namespace: 'default',
            schedule: { number: '10', unit: 'm' },
          });

          // The package policy already exists after create, so re-asserting
          // its presence wouldn't observe the edit. Assert the agent-policy
          // revision strictly increased instead: that is the actual,
          // directly-observable side effect of the batched bump.
          await tryForTime(30_000, async () => {
            const revisionAfterEdit = await getAgentPolicyRevision(
              apiClient,
              adminHeaders,
              privateLocation.agentPolicyId
            );
            expect(revisionAfterEdit).toBeGreaterThan(revisionBeforeEdit);
          });
        } finally {
          await deleteMonitors(apiClient, editorHeaders, [monitorId], { spaceId: 'default' });
        }

        await tryForTime(30_000, async () => {
          const policy = await getPackagePolicyForMonitor(
            apiClient,
            adminHeaders,
            monitorId,
            privateLocation.id
          );
          expect(policy).toBeUndefined();
        });
      }
    );
  }
);
