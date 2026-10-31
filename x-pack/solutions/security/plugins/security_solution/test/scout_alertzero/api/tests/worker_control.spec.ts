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
  cancelNewExecutions,
  createServiceAccount,
  deleteServiceAccount,
  getAdminApi,
  getWorker,
  listChatCompletionConnectors,
  listExecutionIds,
  listWorkers,
  patchWorker,
  resetWorker,
  updateWorker,
  withAlertZeroEnabledInSpace,
} from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;

/**
 * Worker control plane against the real server. Proves the managed catalog is installed
 * (which requires service accounts and the alertzero, proposals and agenticInvestigations
 * plugins to be on) and that enabling a Worker is gated on a service account. Enabling a
 * worker also requires an AI model to be available in the space (Kibana answers 400
 * otherwise), so the tests that enable a worker carry the same no-connector guard as the
 * attack-discovery flow: they skip with an explicit reason when the stack was booted
 * without a preconfigured inference connector. One of them enables a worker, which Task
 * Manager immediately runs for real as its service account — a model-calling run. That run
 * outlives the disable (Task Manager keeps it going), so before the accounts are deleted
 * teardown cancels exactly the runs this suite started and waits for them to stop, per the
 * cleanup contract: a run left in flight can mutate shared-space state after the suite, or
 * collide with the next use of the worker's `cancel-in-progress` concurrency key.
 */
apiTest.describe('AlertZero e2e - worker control', { tag: [...tags.stateful.classic] }, () => {
  const serviceAccountIds: string[] = [];
  // Each worker workflow this suite enabled, with the executions that existed BEFORE its first
  // enable, so teardown can cancel only the runs this suite started — never another suite's.
  // The baseline is snapshotted after the settings write has installed the workflow and before
  // the enable that starts a real run, and it is never replaced: a later snapshot would absorb
  // the run an earlier enable of the same suite started, and teardown would then leave it.
  const enabledWorkflows: { workflowId: string; knownExecutionIds: string[] }[] = [];

  const snapshotBeforeEnable = async (
    api: Awaited<ReturnType<typeof getAdminApi>>,
    workflowId: string
  ): Promise<void> => {
    if (enabledWorkflows.some((entry) => entry.workflowId === workflowId)) {
      return; // keep the earliest baseline for this workflow
    }
    enabledWorkflows.push({
      workflowId,
      knownExecutionIds: await listExecutionIds(api, workflowId),
    });
  };

  // Worker routes are gated on the per-space AlertZero setting; the server config deliberately
  // does not pin it (an override makes it read-only), so this suite turns it on itself and puts
  // the captured baseline back in teardown.
  let restoreAlertZero: (() => Promise<void>) | undefined;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    restoreAlertZero = await withAlertZeroEnabledInSpace({
      apiClient,
      headers: cookieHeader,
      spaceId: 'default',
    });
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const api = await getAdminApi(apiClient, samlAuth);
    // Unbind before deleting the accounts: a worker left pointing at a deleted account leaks into
    // whatever spec runs next.
    await resetWorker(api, WORKER_ID);
    // End the runs this suite's enables started; run before the accounts go away below so a
    // drained run cannot fail after the fact on its deleted service account.
    for (const { workflowId, knownExecutionIds } of enabledWorkflows) {
      await cancelNewExecutions(api, workflowId, knownExecutionIds);
    }
    for (const id of serviceAccountIds) {
      await deleteServiceAccount(api, id);
    }
    // Last, and best-effort: the worker resets above already stopped the gated routes' users.
    await restoreAlertZero?.().catch(() => undefined);
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
      // The model gate runs before the service-account check, so on a stack without a model the
      // enable is refused as `noModel` and this spec cannot reach the guard it exists for. Skip
      // with that reason instead of asserting whatever 4xx comes back first.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion inference connector on this stack; the model gate refuses the enable before the service-account check, so this guard is unreachable'
      );
      // Do not trust spec order: another spec may have left an account bound to this worker.
      await resetWorker(api, WORKER_ID);
      const before = await getWorker(api, WORKER_ID);
      expect(before.settings.serviceAccountId).toBeUndefined();

      const response = await patchWorker(api, WORKER_ID, { enabled: true });
      expect(response.statusCode).toBe(400);
      expect((response.body as { message?: string }).message).toBe(
        `Cannot apply a worker that is enabled without a service account to worker "${WORKER_ID}"`
      );
      expect((await getWorker(api, WORKER_ID)).enabled).toBe(false);
    }
  );

  apiTest(
    'resets a worker that a previous spec left enabled with a service account bound',
    async ({ apiClient, samlAuth }) => {
      const api = await getAdminApi(apiClient, samlAuth);
      // Enabling requires an available AI model in the space; skip rather than fail on a
      // stack booted without a preconfigured inference connector.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion inference connector on this stack; enabling a worker requires an AI model'
      );
      const serviceAccountId = await createServiceAccount(api);
      serviceAccountIds.push(serviceAccountId);
      const before = await getWorker(api, WORKER_ID);
      await updateWorker(api, WORKER_ID, {
        settingsRevision: before.settingsRevision ?? null,
        settings: { serviceAccountId },
      });
      // Snapshot the workflow's executions AFTER the settings write (which is what installs the
      // managed workflow on a fresh stack, so `before.workflowId` can still be absent) and
      // BEFORE enabling: the enable below makes Task Manager run the worker at once as its
      // service account, and teardown must be able to cancel exactly that run (see afterAll),
      // not whatever else shares the workflow.
      const installed = await getWorker(api, WORKER_ID);
      if (installed.workflowId) {
        await snapshotBeforeEnable(api, installed.workflowId);
      }
      await updateWorker(api, WORKER_ID, { enabled: true });

      await resetWorker(api, WORKER_ID);

      const after = await getWorker(api, WORKER_ID);
      expect(after.enabled).toBe(false);
      expect(after.settings.serviceAccountId).toBeUndefined();
    }
  );

  apiTest(
    'enables a worker once a service account is selected, then disables it',
    async ({ apiClient, samlAuth }) => {
      const api = await getAdminApi(apiClient, samlAuth);
      // Enabling requires an available AI model in the space; skip rather than fail on a
      // stack booted without a preconfigured inference connector.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion inference connector on this stack; enabling a worker requires an AI model'
      );
      const serviceAccountId = await createServiceAccount(api);
      serviceAccountIds.push(serviceAccountId);
      const before = await getWorker(api, WORKER_ID);
      const configured = await updateWorker(api, WORKER_ID, {
        settingsRevision: before.settingsRevision ?? null,
        settings: { serviceAccountId },
      });
      expect(configured.settings.serviceAccountId).toBe(serviceAccountId);
      // Same snapshot point as the reset spec above — after the settings write installs the
      // workflow, before the enable starts a real run that teardown must be able to end
      // (see afterAll). The helper keeps the reset spec's earlier baseline if the workflow is
      // the same, so that spec's run is still cancelled as one of ours.
      const installed = await getWorker(api, WORKER_ID);
      if (installed.workflowId) {
        await snapshotBeforeEnable(api, installed.workflowId);
      }

      expect((await updateWorker(api, WORKER_ID, { enabled: true })).enabled).toBe(true);
      expect((await updateWorker(api, WORKER_ID, { enabled: false })).enabled).toBe(false);
    }
  );
});
