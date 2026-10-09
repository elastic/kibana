/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { enableAlertZeroInSpace } from './alertzero_setting';
import { WORKER_IDS } from './constants';
import { provisionWorkerServiceAccounts } from './service_accounts';
import {
  assertWorkerInstalled,
  captureWorker,
  preflightWorkerServiceAccounts,
  restoreWorker,
  writeWorkerAutonomy,
  type KbnRequestContext,
  type WorkerAutonomySnapshot,
} from './worker_settings';

/** What setup changed, so teardown can put it back even when setup failed half way. */
export interface WorkerChainHarnessState {
  /** B4: captured before the first write to each Worker. */
  snapshots: WorkerAutonomySnapshot[];
  /** Puts `securitySolution:enableAlertZero` back; set as soon as the setting is written. */
  restoreAlertZeroSetting?: () => Promise<void>;
  /** R1/R4: service account each Worker runs as. */
  workerServiceAccounts: Record<string, string>;
}

export const createHarnessState = (): WorkerChainHarnessState => ({
  snapshots: [],
  workerServiceAccounts: {},
});

/**
 * The order is load-bearing:
 *  1. enable the per-space AlertZero setting — every `/internal/alertzero/**` route
 *     404s while it is false (its default), including the Workers list;
 *  2. provision the Worker service accounts (a fresh stack has none) unless the
 *     caller pinned one with `ALERTZERO_EVAL_SERVICE_ACCOUNT_ID`;
 *  3. preflight (R4), then per Worker capture -> write -> assert the per-space
 *     workflow is installed (the write is what installs it).
 */
export const setupWorkerChainHarness = async ({
  fetch,
  ctx,
  state,
  log,
  pinnedServiceAccountId,
}: {
  fetch: HttpHandler;
  ctx: KbnRequestContext;
  state: WorkerChainHarnessState;
  log: ToolingLog;
  pinnedServiceAccountId?: string;
}): Promise<void> => {
  state.restoreAlertZeroSetting = await enableAlertZeroInSpace(ctx);
  log.info(`Enabled securitySolution:enableAlertZero in space "${ctx.spaceId}"`);

  const workerIds = Object.values(WORKER_IDS);
  const provisioned = pinnedServiceAccountId
    ? pinnedServiceAccountId
    : await provisionWorkerServiceAccounts(fetch, workerIds);
  state.workerServiceAccounts = await preflightWorkerServiceAccounts(ctx, workerIds, provisioned);
  log.info(
    `Worker service accounts (R1): ${Object.entries(state.workerServiceAccounts)
      .map(([id, sa]) => `${id} -> ${sa}`)
      .join(', ')}`
  );

  const plan = [
    [WORKER_IDS.alertTriage, 'supervised'],
    [WORKER_IDS.attackDiscovery, 'manual'],
  ] as const;
  for (const [workerId, autonomy] of plan) {
    // Pushed before the write: a failed write is still restored.
    state.snapshots.push(await captureWorker(ctx, workerId));
    await writeWorkerAutonomy(ctx, workerId, autonomy, state.workerServiceAccounts[workerId]);
    const workflowId = await assertWorkerInstalled(ctx, workerId);
    log.info(`Worker ${workerId} enabled (workflow ${workflowId})`);
  }
};

/**
 * Workers first, the setting last: restoring a Worker goes through the Workers
 * routes, which 404 once the setting is back to false. Every step is attempted
 * and failures are logged, not thrown.
 */
export const teardownWorkerChainHarness = async ({
  ctx,
  state,
  log,
}: {
  ctx: KbnRequestContext;
  state: WorkerChainHarnessState;
  log: ToolingLog;
}): Promise<void> => {
  for (const snapshot of state.snapshots) {
    await restoreWorker(ctx, snapshot).catch((error: Error) =>
      log.warning(`Could not restore worker ${snapshot.workerId}: ${error.message}`)
    );
  }
  await state
    .restoreAlertZeroSetting?.()
    .catch((error: Error) =>
      log.warning(`Could not restore securitySolution:enableAlertZero: ${error.message}`)
    );
};
