/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import {
  apiTest,
  tags,
  enableAlertZeroInSpace,
  readAlertZeroEnabledInSpace,
  readSupplyStatus,
  setAlertZeroEnabledInSpace,
  setHuntEnabled,
  setSupplyWorkflowEnabled,
  setupHuntPrerequisites,
  spaceUrl,
  withHuntHeaders,
  SUPPLY_RESTORE_URL,
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
 * Live decision-table rows 1, 2, 7, 8, 13, and 17: enable/disable across two spaces,
 * drift via the Workflows API, and Restore. Mutates deployment-global ingest/enrich and
 * the default space's AlertZero setting; beforeAll records them and afterAll puts them back.
 */
apiTest.describe.serial(
  'Hunt Watch - threat intel supply across two spaces',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;
    let prereqA: HuntPrerequisites;
    let prereqB: HuntPrerequisites;
    let initialDefaultAlertZeroEnabled: boolean | undefined;
    const initialSupplyEnabled: Partial<Record<SupplyWorkflowKey, boolean>> = {};

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient }) => {
      await apiServices.spaces.create({ id: SPACE_A, name: SPACE_A });
      await apiServices.spaces.create({ id: SPACE_B, name: SPACE_B });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);

      initialDefaultAlertZeroEnabled = await readAlertZeroEnabledInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: 'default',
      });
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
      try {
        await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_A,
          enabled: false,
        });
      } catch {
        // Space may already be gone or Hunt never enabled.
      }
      try {
        await setHuntEnabled({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE_B,
          enabled: false,
        });
      } catch {
        // Same for B.
      }

      // Disabling Hunt tears the deployment rows down only when no other space hunts, so
      // put each one back to its recorded state through the Workflows API when it differs.
      const after = await readSupplyStatus(apiClient, adminHeaders, 'default');
      for (const key of DEPLOYMENT_SUPPLY_KEYS) {
        const initial = initialSupplyEnabled[key];
        const current = workflowByKey(after.body, key);
        if (initial !== undefined && current?.installed && current.enabled !== initial) {
          await setSupplyWorkflowEnabled({
            apiClient,
            headers: adminHeaders,
            key,
            enabled: initial,
          });
        }
      }

      await prereqA?.cleanup();
      await prereqB?.cleanup();
      await apiServices.spaces.delete(SPACE_A);
      await apiServices.spaces.delete(SPACE_B);
      await setAlertZeroEnabledInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: 'default',
        enabled: initialDefaultAlertZeroEnabled,
      });
    });

    apiTest(
      '1. enabling Hunt in A turns ingest, enrich, and attribute-A on',
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
      '2. enabling Hunt in B leaves deployment rows on and turns attribute-B on',
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
      '7/8. disabling Hunt in A turns attribute-A off and marks deployment rows in use elsewhere',
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

    apiTest('7. disabling Hunt in B turns deployment rows off', async ({ apiClient }) => {
      const disable = await setHuntEnabled({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE_B,
        enabled: false,
      });
      expect(disable.statusCode).toBe(200);

      const statusB = await readSupplyStatus(apiClient, adminHeaders, SPACE_B);
      expect(statusB.body.huntEnabled).toBe(false);
      expect(workflowByKey(statusB.body, 'ingest')?.enabled).toBe(false);
      expect(workflowByKey(statusB.body, 'enrich')?.enabled).toBe(false);
      expect(workflowByKey(statusB.body, 'attribute')?.enabled).toBe(false);
    });

    apiTest('13/17. re-enable A, drift ingest off, Restore clears drift', async ({ apiClient }) => {
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

      const restore = await apiClient.post(spaceUrl(SUPPLY_RESTORE_URL, SPACE_A), {
        headers: adminHeaders,
        responseType: 'json',
        body: {},
      });
      expect(restore.statusCode).toBe(200);

      const healed = await readSupplyStatus(apiClient, adminHeaders, SPACE_A);
      expect(healed.body.drift).toBe(false);
      expect(workflowByKey(healed.body, 'ingest')?.enabled).toBe(true);
    });
  }
);
