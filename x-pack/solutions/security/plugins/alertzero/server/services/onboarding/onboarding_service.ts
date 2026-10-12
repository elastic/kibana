/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { workerRegistry, installRegisteredWorker } from '../../managed_workflows/worker_registry';

export interface OnboardingTransactionResult {
  outcome: 'enabled' | 'disabled' | 'failed';
  spaceId: string;
  /** Workers installed (or removed, for disable) by this call. */
  installedWorkerIds: string[];
  /** Set when `outcome` is `failed`; names what could not be installed or removed. */
  error?: string;
}

export interface OnboardingServiceDependencies {
  logger: Logger;
  /** Resolves the plugin-scoped managed workflows client, or undefined when unavailable. */
  getManagedWorkflows: () => Promise<PluginScopedManagedWorkflowsApi | undefined>;
  /** Creates the AlertZero agent in the space if missing. Must reject on failure. */
  ensureAgentForSpace?: (spaceId: string) => Promise<void>;
}

/**
 * Enable/disable transaction for AlertZero onboarding.
 *
 * Enable: reconcile every registered watch worker into the space, ensure the AlertZero
 * agent, then commit the caller's source-of-truth write. Install is how the durable
 * per-space Worker document is persisted, so it doubles as the settings-editing API:
 * already-installed workers are re-installed with their PERSISTED template values rather
 * than defaults, which keeps a repeated enable idempotent instead of resetting saved
 * autonomy/schedules. Workers are installed with `workflowIdSuffix: spaceId` so installs
 * are space-scoped. On failure we compensate by uninstalling only the workers this
 * attempt created, so a retry starts clean without deleting pre-existing work.
 *
 * Disable: uninstall watch workers from the space. Conversations and other
 * customer-visible history are never deleted. A worker that could not be removed is
 * reported as a failure — not logged and reported as a successful disable.
 */
export class OnboardingService {
  constructor(private readonly deps: OnboardingServiceDependencies) {}

  async enable(
    spaceId: string,
    commit?: () => Promise<void>
  ): Promise<OnboardingTransactionResult> {
    // Compensation owns only what this attempt created: pre-existing workers stay put.
    const created: string[] = [];
    const managedWorkflows = await this.deps.getManagedWorkflows();
    if (!managedWorkflows) {
      return {
        outcome: 'failed',
        spaceId,
        installedWorkerIds: [],
        error: 'Managed workflows are unavailable',
      };
    }
    try {
      for (const registration of workerRegistry.list()) {
        const target = { spaceId, workflowIdSuffix: spaceId };
        const before = await managedWorkflows.getWorkflowStatus(registration.id, target);
        // Reuse what the space already persisted for an installed worker: install is also
        // the settings-write path, so re-seeding defaults here would discard user edits.
        const persisted = before.installed
          ? await managedWorkflows.getInstalledWorkflowState(before.workflowId, spaceId)
          : null;
        await installRegisteredWorker(managedWorkflows, registration, {
          ...target,
          values: persisted?.templateValues ?? registration.settings.createDefaultValues(),
        });
        if (!before.installed) {
          // Compensation ownership starts the moment the install resolves — before the
          // verification read, which may reject on a workflow that is already persisted.
          created.push(registration.id);
        }
        const status = await managedWorkflows.getWorkflowStatus(registration.id, target);
        if (!status.installed) {
          throw new Error(`Worker "${registration.id}" did not persist after install`);
        }
      }
      if (this.deps.ensureAgentForSpace) {
        await this.deps.ensureAgentForSpace(spaceId);
      }
      // Commit inside the compensation boundary: a rejected source-of-truth write must
      // remove the installs, otherwise enabled workers run in a space that never enabled.
      if (commit) {
        await commit();
      }
      this.deps.logger.info(
        `AlertZero enabled in space "${spaceId}" (${created.length} workers installed)`
      );
      return { outcome: 'enabled', spaceId, installedWorkerIds: created };
    } catch (error) {
      for (const workerId of created) {
        try {
          await managedWorkflows.uninstall(
            workerId as Parameters<typeof managedWorkflows.uninstall>[0],
            {
              spaceId,
              // Installed with workflowIdSuffix=spaceId, so the rollback must name the
              // same suffixed instance — without it the uninstall removes nothing and
              // a partially-enabled space keeps running workers it never committed to.
              workflowIdSuffix: spaceId,
            }
          );
        } catch (rollbackError) {
          this.deps.logger.error(
            `AlertZero enable rollback failed for worker "${workerId}" in space "${spaceId}": ${rollbackError}`
          );
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      this.deps.logger.error(`AlertZero enable failed in space "${spaceId}": ${message}`);
      return { outcome: 'failed', spaceId, installedWorkerIds: [], error: message };
    }
  }

  async disable(spaceId: string): Promise<OnboardingTransactionResult> {
    const managedWorkflows = await this.deps.getManagedWorkflows();
    if (!managedWorkflows) {
      return {
        outcome: 'failed',
        spaceId,
        installedWorkerIds: [],
        error: 'Managed workflows are unavailable',
      };
    }
    const removed: string[] = [];
    const failed: string[] = [];
    for (const registration of workerRegistry.list()) {
      try {
        const status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (status.installed) {
          // Target the same suffixed instance that enable() installed.
          await managedWorkflows.uninstall(registration.id, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
          removed.push(registration.id);
        }
      } catch (workerError) {
        // A worker that is not installed is not a failure (getWorkflowStatus reports
        // `installed: false` rather than rejecting); anything that reaches here may have
        // left a running worker behind in a space the caller believes is off.
        failed.push(registration.id);
        this.deps.logger.error(
          `AlertZero disable: worker "${registration.id}" not removed in space "${spaceId}": ${workerError}`
        );
      }
    }
    if (failed.length > 0) {
      const message = `Workers not removed: ${failed.join(', ')}`;
      this.deps.logger.error(`AlertZero disable failed in space "${spaceId}": ${message}`);
      return { outcome: 'failed', spaceId, installedWorkerIds: removed, error: message };
    }
    this.deps.logger.info(
      `AlertZero disabled in space "${spaceId}" (${removed.length} workers removed)`
    );
    return { outcome: 'disabled', spaceId, installedWorkerIds: removed };
  }
}
