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
  pollUntil,
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
 * without a chat-completion AI connector. One of them enables a worker, which Task
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

  // The floor worker's run executes the shared Attack Discovery runner as its service account,
  // and the runner dispatches one review per generated attack. Those children are separate
  // executions (and separate workflows), so cancelling only the floor worker's own run leaves
  // them mid-model-call when the account is deleted. Baselined together with the worker's
  // workflow, before the enable that starts them.
  const snapshotWorkerWorkflowsBeforeEnable = async (
    api: Awaited<ReturnType<typeof getAdminApi>>
  ): Promise<void> => {
    await snapshotBeforeEnable(api, await waitForInstalledWorkflowId(api));
    for (const workflowId of testData.ATTACK_DISCOVERY_RUN_WORKFLOW_IDS) {
      await snapshotBeforeEnable(api, workflowId);
    }
  };

  // The settings write installs the managed workflow, but the catalog surfaces it through the
  // SML indexer asynchronously, so the read can lag the install. Without the baseline the
  // teardown cannot tell this suite's runs from anyone else's, so a workflow that never shows
  // up is a hard failure rather than a skipped snapshot.
  const waitForInstalledWorkflowId = async (
    api: Awaited<ReturnType<typeof getAdminApi>>
  ): Promise<string> => {
    const installed = await pollUntil(
      `worker ${WORKER_ID} to have a workflow installed`,
      async () => {
        const candidate = await getWorker(api, WORKER_ID);
        return candidate.workflowId ? candidate : undefined;
      },
      { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
    );
    if (!installed.workflowId) {
      throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
    }
    return installed.workflowId;
  };

  // Worker routes are gated on the per-space AlertZero setting; the server config deliberately
  // does not pin it (an override makes it read-only), so this suite turns it on itself and puts
  // the captured baseline back in teardown.
  let restoreAlertZero: (() => Promise<void>) | undefined;
  // The worker's pre-suite state, captured in beforeAll; stays `undefined` if the read failed
  // (e.g. it raced the gate enable). A clean worker reads as `{ enabled: false }`. Teardown restores it instead of resetting to disabled: this suite
  // does not own the worker, and another suite (or an operator) may have deliberately left it
  // enabled with its own account bound.
  let workerBaseline: { enabled: boolean; serviceAccountId?: string } | undefined;

  apiTest.beforeAll(async ({ apiClient, apiServices, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    restoreAlertZero = await withAlertZeroEnabledInSpace({
      apiClient,
      apiServices,
      headers: cookieHeader,
      spaceId: 'default',
    });
    try {
      const api = await getAdminApi(apiClient, samlAuth);
      const before = await getWorker(api, WORKER_ID);
      workerBaseline = {
        enabled: before.enabled,
        ...(before.settings.serviceAccountId !== undefined
          ? { serviceAccountId: before.settings.serviceAccountId }
          : {}),
      };
    } catch {
      // The catalog read raced the gate enable; teardown falls back to the reset it can do.
    }
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    // One drain per enabled workflow, each up to DRAIN_BUDGET_MS, then the account cleanup.
    // Without this a slow drain trips the default hook timeout before the accounts are deleted.
    apiTest.setTimeout(
      enabledWorkflows.length * testData.DRAIN_BUDGET_MS + testData.TEARDOWN_CLEANUP_BUDGET_MS
    );
    // Every step runs even when an earlier one throws (a drain timeout, say), so one failure
    // cannot leak the superuser service accounts or the per-space gate. Failures are reported
    // together.
    const errors: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    };
    let api: Awaited<ReturnType<typeof getAdminApi>> | undefined;
    await attempt(async () => {
      api = await getAdminApi(apiClient, samlAuth);
    });
    // Unbind before deleting the accounts: a worker left pointing at a deleted account leaks into
    // whatever spec runs next.
    await attempt(async () => {
      if (api) await resetWorker(api, WORKER_ID);
    });
    // End the runs this suite's enables started; run before the accounts go away below so a
    // drained run cannot fail after the fact on its deleted service account.
    for (const { workflowId, knownExecutionIds } of enabledWorkflows) {
      await attempt(async () => {
        if (api) await cancelNewExecutions(api, workflowId, knownExecutionIds);
      });
    }
    for (const id of serviceAccountIds) {
      await attempt(async () => {
        if (api) await deleteServiceAccount(api, id);
      });
    }
    // Restore the worker's pre-suite state instead of clearing it: another suite or an operator
    // may have deliberately left it enabled with its own account bound, and only the mutating
    // specs below would have dirtied it anyway. A baseline that read the worker already clean
    // is satisfied by the `resetWorker` above; one that read it enabled re-binds and re-enables.
    // Every step is attempt-wrapped: a restore must not shadow the account deletions' errors.
    await attempt(async () => {
      if (!api || !workerBaseline) {
        return;
      }
      const baselineAccount = workerBaseline.serviceAccountId;
      if (baselineAccount !== undefined) {
        const current = await getWorker(api, WORKER_ID);
        if (current.settings.serviceAccountId !== baselineAccount) {
          await updateWorker(api, WORKER_ID, {
            settingsRevision: current.settingsRevision ?? null,
            settings: { serviceAccountId: baselineAccount },
          });
        }
      }
      if (workerBaseline.enabled) {
        const current = await getWorker(api, WORKER_ID);
        if (!current.enabled) {
          // The baseline snapshot's drain baselines: an enable here starts a real run, but the
          // worker was already enabled before this suite, so that run is the state we restore,
          // not one to cancel.
          await updateWorker(api, WORKER_ID, { enabled: true });
        }
      }
    });
    await attempt(async () => {
      await restoreAlertZero?.();
    });
    if (errors.length > 0) {
      throw new Error(
        `AlertZero worker control cleanup failed: ${errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('; ')}`
      );
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
      // The model gate runs before the service-account check, so on a stack without a model the
      // enable is refused as `noModel` and this spec cannot reach the guard it exists for. Skip
      // with that reason instead of asserting whatever 4xx comes back first.
      //
      // A test-owned placeholder connector cannot unblock it: the gate resolves endpoints
      // through the inference plugin (`getForFeature`), which only counts an endpoint once
      // `fetchConnectors` can read it back — either an ES inference endpoint
      // (`esClient.inference.get`) or a real chat-completion connector. Creating a placeholder
      // `.inference` connector via the Actions API runs the connector's pre-save hook, which
      // `PUT`s the endpoint into ES with a real provider (`elastic` needs the EIS inference
      // URL, `elasticsearch` needs a deployed model) — neither exists on a connector-free
      // stack, so the create is rejected before the connector ever lists. The skip stays.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion AI connector on this stack; the model gate refuses the enable before the service-account check, so this guard is unreachable'
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
      // stack booted without a chat-completion AI connector.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion AI connector on this stack; enabling a worker requires an AI model'
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
      await snapshotWorkerWorkflowsBeforeEnable(api);
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
      // stack booted without a chat-completion AI connector.
      apiTest.skip(
        (await listChatCompletionConnectors(api)).length === 0,
        'no preconfigured chat-completion AI connector on this stack; enabling a worker requires an AI model'
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
      await snapshotWorkerWorkflowsBeforeEnable(api);

      expect((await updateWorker(api, WORKER_ID, { enabled: true })).enabled).toBe(true);
      expect((await updateWorker(api, WORKER_ID, { enabled: false })).enabled).toBe(false);
    }
  );
});
