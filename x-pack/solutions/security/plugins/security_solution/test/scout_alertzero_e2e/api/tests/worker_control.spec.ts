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
  testData,
  createServiceAccount,
  deleteServiceAccount,
  getAdminApi,
  getWorker,
  listWorkers,
  patchWorker,
  updateWorker,
} from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;

/**
 * Worker control plane against the real server. Needs no model call: it proves the managed
 * catalog is installed (which requires service accounts and the alertzero, proposals and
 * agenticInvestigations plugins to be on) and that enabling a Worker is gated on a service
 * account.
 */
apiTest.describe('AlertZero e2e - worker control', { tag: [...tags.stateful.classic] }, () => {
  const serviceAccountIds: string[] = [];

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const api = await getAdminApi(apiClient, samlAuth);
    await patchWorker(api, WORKER_ID, { enabled: false });
    for (const id of serviceAccountIds) {
      await deleteServiceAccount(api, id);
    }
  });

  apiTest('lists the managed security workers', async ({ apiClient, samlAuth }) => {
    const api = await getAdminApi(apiClient, samlAuth);
    const ids = (await listWorkers(api)).map((worker) => worker.id);
    for (const expected of [
      testData.FLOOR_ALERT_TRIAGE_WORKER_ID,
      WORKER_ID,
      testData.FORENSICS_ENDPOINT_ANALYSIS_WORKER_ID,
    ]) {
      expect(ids).toContain(expected);
    }
  });

  apiTest(
    'refuses to enable a worker that has no service account',
    async ({ apiClient, samlAuth }) => {
      const api = await getAdminApi(apiClient, samlAuth);
      const before = await getWorker(api, WORKER_ID);
      expect(before.settings.serviceAccountId).toBeUndefined();

      const response = await patchWorker(api, WORKER_ID, { enabled: true });
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
      expect((await getWorker(api, WORKER_ID)).enabled).toBe(false);
    }
  );

  apiTest(
    'enables a worker once a service account is selected, then disables it',
    async ({ apiClient, samlAuth }) => {
      const api = await getAdminApi(apiClient, samlAuth);
      const serviceAccountId = await createServiceAccount(api);
      serviceAccountIds.push(serviceAccountId);
      const before = await getWorker(api, WORKER_ID);

      const configured = await updateWorker(api, WORKER_ID, {
        settingsRevision: before.settingsRevision ?? null,
        settings: { serviceAccountId },
      });
      expect(configured.settings.serviceAccountId).toBe(serviceAccountId);

      expect((await updateWorker(api, WORKER_ID, { enabled: true })).enabled).toBe(true);
      expect((await updateWorker(api, WORKER_ID, { enabled: false })).enabled).toBe(false);
    }
  );
});
