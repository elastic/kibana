/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import {
  apiTest,
  tags,
  enableAlertZeroInSpace,
  readAlertZeroEnabledInSpace,
  readSupplyStatus,
  runCleanupSteps,
  setAlertZeroEnabledInSpace,
  setHuntEnabled,
  setSupplyWorkflowEnabled,
  setupHuntPrerequisites,
  spaceUrl,
  withHuntHeaders,
  type HuntPrerequisites,
  type SupplyStatusBody,
  type SupplyWorkflowKey,
} from '../fixtures';

const RUN = Date.now();
const SPACE_A = `hunt-supply-a-${RUN}`;
const SPACE_B = `hunt-supply-b-${RUN}`;
const DEPLOYMENT_SUPPLY_KEYS: readonly SupplyWorkflowKey[] = ['ingest', 'enrich'];

const workflowByKey = (status: SupplyStatusBody, key: string) =>
  status.workflows.find((row) => row.key === key);

/**
 * Live enable/disable across two spaces, drift via the Workflows API, and Restore. The
 * same transitions run in isolation in `threat_intel_supply_service.test.ts`. Mutates
 * deployment-global ingest/enrich and the default space's AlertZero setting; beforeAll
 * records them and afterAll puts them back.
 */
apiTest.describe.serial(
  'Hunt Watch - threat intel supply across two spaces',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;
    let prereqA: HuntPrerequisites;
    let prereqB: HuntPrerequisites;
    // Captured only once beforeAll reads it, so a setup failure before that point does not
    // make afterAll clear a setting this suite never touched.
    let defaultAlertZeroBaseline: { enabled: boolean | undefined } | undefined;
    const initialSupplyEnabled: Partial<Record<SupplyWorkflowKey, boolean>> = {};
    // A shared stack may already hunt in the default space or another one. Those consumers
    // keep ingest and enrich on after this suite's last Hunt goes off, so the last-consumer
    // row below asserts against this instead of assuming A and B are the only Hunts.
    let otherSpacesHunt = false;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient }) => {
      await apiServices.spaces.create({ id: SPACE_A, name: SPACE_A });
      await apiServices.spaces.create({ id: SPACE_B, name: SPACE_B });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);

      defaultAlertZeroBaseline = {
        enabled: await readAlertZeroEnabledInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: 'default',
        }),
      };
      await enableAlertZeroInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: 'default',
      });

      // Capture deployment-global rows from the default space before any Hunt enable.
      const baseline = await readSupplyStatus(apiClient, adminHeaders, 'default');
      expect(baseline.statusCode).toBe(200);
      for (const key of DEPLOYMENT_SUPPLY_KEYS) {
        initialSupplyEnabled[key] = workflowByKey(baseline.body, key)?.enabled;
      }
      otherSpacesHunt =
        baseline.body.huntEnabled || baseline.body.workflows.some((row) => row.inUseElsewhere);

      prereqA = await setupHuntPrerequisites({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_A,
      });
      prereqB = await setupHuntPrerequisites({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_B,
      });

      // Both spaces start with Hunt off.
      await setHuntEnabled({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_A,
        enabled: false,
      });
      await setHuntEnabled({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_B,
        enabled: false,
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient }) => {
      // Disabling Hunt tears the deployment rows down only when no other space hunts, so
      // put each one back to its recorded state through the Workflows API when it differs.
      const restoreDeploymentSupply = async () => {
        const after = await readSupplyStatus(apiClient, adminHeaders, 'default');
        for (const key of DEPLOYMENT_SUPPLY_KEYS) {
          const initial = initialSupplyEnabled[key];
          const current = after.statusCode === 200 ? workflowByKey(after.body, key) : undefined;
          if (initial !== undefined && current?.installed && current.enabled !== initial) {
            await setSupplyWorkflowEnabled({
              apiClient,
              headers: adminHeaders,
              key,
              enabled: initial,
            });
          }
        }
      };
      const disableHunt = (spaceId: string) =>
        setHuntEnabled({ apiClient, headers: adminHeaders, spaceId, enabled: false });

      // Every step runs even when an earlier one throws, so a failed connector or account
      // delete cannot leave spaces or the default-space setting behind for later specs.
      await runCleanupSteps([
        { name: `disable Hunt in ${SPACE_A}`, run: () => disableHunt(SPACE_A) },
        { name: `disable Hunt in ${SPACE_B}`, run: () => disableHunt(SPACE_B) },
        { name: 'restore deployment supply rows', run: restoreDeploymentSupply },
        { name: `clean up prerequisites in ${SPACE_A}`, run: () => prereqA?.cleanup() },
        { name: `clean up prerequisites in ${SPACE_B}`, run: () => prereqB?.cleanup() },
        { name: `delete space ${SPACE_A}`, run: () => apiServices.spaces.delete(SPACE_A) },
        { name: `delete space ${SPACE_B}`, run: () => apiServices.spaces.delete(SPACE_B) },
        {
          name: 'restore default space AlertZero setting',
          run: async () => {
            if (!defaultAlertZeroBaseline) return;
            await setAlertZeroEnabledInSpace({
              apiClient,
              headers: adminHeaders,
              spaceId: 'default',
              enabled: defaultAlertZeroBaseline.enabled,
            });
          },
        },
      ]);
    });

    apiTest(
      'enabling Hunt in A turns ingest, enrich, and attribute-A on',
      async ({ apiClient }) => {
        const enable = await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_A,
          enabled: true,
          serviceAccountId: prereqA.serviceAccountId,
        });
        expect(enable.statusCode).toBe(200);

        const status = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
        expect(status.statusCode).toBe(200);
        expect(status.body.huntEnabled).toBe(true);
        expect(status.body.workflows.map(({ key, enabled }) => [key, enabled])).toStrictEqual([
          ['ingest', true],
          ['enrich', true],
          ['attribute', true],
        ]);
      }
    );

    apiTest(
      'enabling Hunt in B leaves deployment rows on and turns attribute-B on',
      async ({ apiClient }) => {
        const enable = await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_B,
          enabled: true,
          serviceAccountId: prereqB.serviceAccountId,
        });
        expect(enable.statusCode).toBe(200);

        const statusB = await readSupplyStatus(apiClient, adminHeaders, SPACE_B);
        expect(statusB.body.workflows.map(({ key, enabled }) => [key, enabled])).toStrictEqual([
          ['ingest', true],
          ['enrich', true],
          ['attribute', true],
        ]);

        const statusA = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
        expect(workflowByKey(statusA.body, 'ingest')?.enabled).toBe(true);
        expect(workflowByKey(statusA.body, 'attribute')?.enabled).toBe(true);
      }
    );

    apiTest(
      'disabling Hunt in A turns attribute-A off and marks deployment rows in use elsewhere',
      async ({ apiClient }) => {
        const disable = await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_A,
          enabled: false,
        });
        expect(disable.statusCode).toBe(200);

        const statusA = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
        expect(statusA.body.huntEnabled).toBe(false);
        expect(workflowByKey(statusA.body, 'attribute')?.enabled).toBe(false);
        expect(workflowByKey(statusA.body, 'ingest')?.enabled).toBe(true);
        expect(workflowByKey(statusA.body, 'ingest')?.inUseElsewhere).toBe(true);
        expect(workflowByKey(statusA.body, 'enrich')?.inUseElsewhere).toBe(true);

        const statusB = await readSupplyStatus(apiClient, adminHeaders, SPACE_B);
        expect(statusB.body.huntEnabled).toBe(true);
        expect(workflowByKey(statusB.body, 'attribute')?.enabled).toBe(true);
      }
    );

    apiTest(
      'disabling Hunt in B turns deployment rows off unless another space still hunts',
      async ({ apiClient }) => {
        const disable = await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_B,
          enabled: false,
        });
        expect(disable.statusCode).toBe(200);

        const statusB = await readSupplyStatus(apiClient, adminHeaders, SPACE_B);
        expect(statusB.body.huntEnabled).toBe(false);
        expect(workflowByKey(statusB.body, 'attribute')?.enabled).toBe(false);
        for (const key of DEPLOYMENT_SUPPLY_KEYS) {
          const row = workflowByKey(statusB.body, key);
          expect(row?.enabled).toBe(otherSpacesHunt);
          expect(row?.inUseElsewhere ?? false).toBe(otherSpacesHunt);
        }
      }
    );

    apiTest('re-enable A, drift ingest off, Restore clears drift', async ({ apiClient }) => {
      const enable = await setHuntEnabled({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_A,
        enabled: true,
        serviceAccountId: prereqA.serviceAccountId,
      });
      expect(enable.statusCode).toBe(200);

      const driftOff = await setSupplyWorkflowEnabled({
        apiClient,
        headers: adminHeaders,
        key: 'ingest',
        enabled: false,
      });
      expect(driftOff.statusCode).toBe(200);

      const drifted = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
      expect(drifted.body.drift).toBe(true);
      expect(workflowByKey(drifted.body, 'ingest')?.enabled).toBe(false);

      const restore = await apiClient.post(
        spaceUrl(HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL, SPACE_A),
        {
          headers: adminHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect(restore.statusCode).toBe(200);

      const healed = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
      expect(healed.body.drift).toBe(false);
      expect(workflowByKey(healed.body, 'ingest')?.enabled).toBe(true);
    });
  }
);
