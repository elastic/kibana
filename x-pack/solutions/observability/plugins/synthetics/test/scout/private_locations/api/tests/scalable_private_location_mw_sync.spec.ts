/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { addMonitor, deleteMonitors, getMonitor } from '../../../common/fixtures/monitors';
import {
  deleteFleetAgents,
  getAgentPolicyRevisionInfo,
  getPackagePolicyForMonitor,
  indexFakeFleetAgent,
  setFleetAgentLastCheckin,
} from '../../../common/fixtures/fleet';
import { createDeadline, tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';
import {
  MW_DURATION_MS,
  createMaintenanceWindow,
  deleteMaintenanceWindow,
  parseMaintenanceWindowsVar,
  updateMaintenanceWindow,
} from '../../../common/fixtures/maintenance_windows';

const TEST_TIMEOUT = 3 * 60 * 1000;
const UPDATED_MW_DURATION_MS = 2 * MW_DURATION_MS;
const TRIGGER_SYNC_TASK_PATH = 'internal/synthetics/trigger_task_run/syncPrivateLocationMonitors';

/**
 * End-to-end coverage for `SyncPrivateLocationMonitorsTask` reacting to
 * maintenance-window changes: an updated window is redeployed to the package
 * policies of the monitors referencing it, and a deleted one is stripped from
 * both those package policies and the monitors.
 *
 * The location gets a fake enrolled agent so its package policies carry an
 * agent `condition`, which is what routes writes through the deferred,
 * once-per-sync agent-policy revision bump. Without it every write would take
 * Fleet's own immediate bump and the deferred path would go untested. The
 * deferred bump is asserted via the agent policy's `updated_at` not being
 * older than the package policy's: those writes use `bumpRevision: false`, so
 * only the deferred bump can move it past them.
 */
apiTest.describe(
  'ScalablePrivateLocationMaintenanceWindowSync',
  { tag: ['@local-stateful-classic'] },
  () => {
    let adminHeaders: Record<string, string>;
    let privateLocation: ScoutPrivateLocation;
    let agentId: string;

    const addMonitorWithMw = async (apiClient: ApiClientFixture, mwId: string) => {
      const res = await addMonitor(apiClient, adminHeaders, {
        ...httpMonitorFixture,
        locations: [privateLocation],
        name: `MW sync monitor ${uuidv4()}`,
        namespace: 'default',
        maintenance_windows: [mwId],
      });
      return (res.body as { id: string }).id;
    };

    const getPolicy = async (apiClient: ApiClientFixture, monitorId: string) => {
      const policy = await getPackagePolicyForMonitor(
        apiClient,
        adminHeaders,
        monitorId,
        privateLocation.id
      );
      expect(policy, `package policy for monitor ${monitorId}`).toBeDefined();
      return policy as PackagePolicy;
    };

    const waitForInitialMwDeploy = async (
      apiClient: ApiClientFixture,
      monitorId: string,
      timeoutMs: number
    ) =>
      tryForTime(timeoutMs, async () => {
        const policy = await getPolicy(apiClient, monitorId);
        expect(typeof policy.condition, 'package policy is agent-sharded').toBe('string');
        expect(parseMaintenanceWindowsVar(policy)).toStrictEqual([
          expect.objectContaining({ duration: `${MW_DURATION_MS}ms` }),
        ]);
      });

    // A maintenance-window change already asks the task to run soon, but that
    // request gives up if a run is still in flight (e.g. one started by a
    // sibling test's cleanup), and that run may have read the windows before
    // the change. Retrying until accepted guarantees a run that sees it.
    const triggerSync = async (apiClient: ApiClientFixture, timeoutMs: number) =>
      tryForTime(timeoutMs, async () => {
        const res = await apiClient.post(TRIGGER_SYNC_TASK_PATH, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
      });

    const expectDeferredBumpAfter = async (
      apiClient: ApiClientFixture,
      policy: PackagePolicy,
      revisionBefore: number
    ) => {
      const agentPolicy = await getAgentPolicyRevisionInfo(
        apiClient,
        adminHeaders,
        privateLocation.agentPolicyId
      );
      expect(agentPolicy.revision).toBeGreaterThan(revisionBefore);
      expect(
        Date.parse(agentPolicy.updated_at),
        'agent policy bumped after the package policy write'
      ).toBeGreaterThanOrEqual(Date.parse(policy.updated_at));
    };

    apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(apiKeyHeader);

      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();
      privateLocation = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(
        'default'
      );
      agentId = await indexFakeFleetAgent(esClient, privateLocation.agentPolicyId, {
        hostname: 'mw-sync-agent',
      });
    });

    // A new monitor only gets an agent `condition` while some agent's check-in
    // is fresher than `STALE_CHECKIN_MS`.
    apiTest.beforeEach(async ({ esClient }) => {
      await setFleetAgentLastCheckin(esClient, agentId, new Date().toISOString());
    });

    apiTest.afterAll(async ({ apiServices, kbnClient, esClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await deleteFleetAgents(esClient, [agentId]);
      await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
    });

    apiTest(
      'redeploys an updated maintenance window and bumps the agent policy',
      async ({ apiClient, kbnClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT);
        const deadline = createDeadline(TEST_TIMEOUT - 10_000);
        const mw = await createMaintenanceWindow(kbnClient);
        let monitorId: string | undefined;

        try {
          monitorId = await addMonitorWithMw(apiClient, mw.id);
          await waitForInitialMwDeploy(apiClient, monitorId, deadline.remaining());
          const { revision: revisionBefore } = await getAgentPolicyRevisionInfo(
            apiClient,
            adminHeaders,
            privateLocation.agentPolicyId
          );

          await updateMaintenanceWindow(kbnClient, mw.id, {
            duration: UPDATED_MW_DURATION_MS,
            r_rule: mw.r_rule,
          });
          await triggerSync(apiClient, deadline.remaining());

          await tryForTime(deadline.remaining(), async () => {
            const policy = await getPolicy(apiClient, monitorId as string);
            expect(parseMaintenanceWindowsVar(policy)).toStrictEqual([
              expect.objectContaining({ duration: `${UPDATED_MW_DURATION_MS}ms` }),
            ]);
            await expectDeferredBumpAfter(apiClient, policy, revisionBefore);
          });
        } finally {
          if (monitorId) {
            await deleteMonitors(apiClient, adminHeaders, [monitorId], { spaceId: 'default' });
          }
          await deleteMaintenanceWindow(kbnClient, mw.id);
        }
      }
    );

    apiTest(
      'removes a deleted maintenance window from the package policy and the monitor',
      async ({ apiClient, kbnClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT);
        const deadline = createDeadline(TEST_TIMEOUT - 10_000);
        const mw = await createMaintenanceWindow(kbnClient);
        let monitorId: string | undefined;

        try {
          monitorId = await addMonitorWithMw(apiClient, mw.id);
          await waitForInitialMwDeploy(apiClient, monitorId, deadline.remaining());
          const { revision: revisionBefore } = await getAgentPolicyRevisionInfo(
            apiClient,
            adminHeaders,
            privateLocation.agentPolicyId
          );
          const { rawBody: monitorBefore } = await getMonitor(apiClient, adminHeaders, monitorId);
          expect(monitorBefore.maintenance_windows).toStrictEqual([mw.id]);

          await deleteMaintenanceWindow(kbnClient, mw.id);
          await triggerSync(apiClient, deadline.remaining());

          await tryForTime(deadline.remaining(), async () => {
            const policy = await getPolicy(apiClient, monitorId as string);
            // The redeploy runs while the monitor still references the deleted
            // window, which formats to a `null` entry rather than nothing.
            expect((parseMaintenanceWindowsVar(policy) ?? []).filter(Boolean)).toStrictEqual([]);
            await expectDeferredBumpAfter(apiClient, policy, revisionBefore);

            const { rawBody } = await getMonitor(apiClient, adminHeaders, monitorId as string);
            // GET omits an empty `maintenance_windows`.
            expect(rawBody.maintenance_windows ?? []).toStrictEqual([]);
          });
        } finally {
          if (monitorId) {
            await deleteMonitors(apiClient, adminHeaders, [monitorId], { spaceId: 'default' });
          }
          await deleteMaintenanceWindow(kbnClient, mw.id);
        }
      }
    );
  }
);
