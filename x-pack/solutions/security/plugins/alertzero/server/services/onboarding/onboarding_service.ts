/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPLv1) for more details.
 */
import type { Logger } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  workerRegistry,
  installRegisteredWorker,
} from '../../managed_workflows/worker_registry';

export interface OnboardingTransactionResult {
  outcome: 'enabled' | 'disabled' | 'failed';
  spaceId: string;
  installedWorkerIds: string[];
  error?: string;
}

export interface OnboardingServiceDependencies {
  logger: Logger;
  /** Resolves the plugin-scoped managed workflows client, or undefined when unavailable. */
  getManagedWorkflows: () => Promise<PluginScopedManagedWorkflowsApi | undefined>;
  /** Creates the AlertZero agent in the space if missing. */
  ensureAgentForSpace?: (spaceId: string) => Promise<void>;
}

/**
 * Enable/disable transaction for AlertZero onboarding.
 *
 * Enable: install every registered watch worker into the space with default
 * settings (autonomy = manual — the default values include it), then ensure the
 * AlertZero agent exists. Install is idempotent: the managed-workflows client
 * reconciles by workflow id, and workers are installed with `workflowIdSuffix:
 * spaceId` so installs are space-scoped. On failure we compensate by
 * uninstalling whatever landed so a retry starts clean.
 *
 * Disable: uninstall watch workers from the space. Conversations and other
 * customer-visible history are never deleted.
 */
export class OnboardingService {
  constructor(private readonly deps: OnboardingServiceDependencies) {}

  async enable(spaceId: string): Promise<OnboardingTransactionResult> {
    const installed: string[] = [];
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
        await installRegisteredWorker(managedWorkflows, registration, {
          spaceId,
          workflowIdSuffix: spaceId,
          values: registration.settings.createDefaultValues(),
        });
        const status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (!status.installed) {
          throw new Error(`Worker "${registration.id}" did not persist after install`);
        }
        installed.push(registration.id);
      }
      if (this.deps.ensureAgentForSpace) {
        await this.deps.ensureAgentForSpace(spaceId);
      }
      this.deps.logger.info(
        `AlertZero enabled in space "${spaceId}" (${installed.length} workers installed)`
      );
      return { outcome: 'enabled', spaceId, installedWorkerIds: installed };
    } catch (error) {
      for (const workerId of installed) {
        try {
          await managedWorkflows.uninstall(workerId as Parameters<typeof managedWorkflows.uninstall>[0], {
            spaceId,
          });
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
    for (const registration of workerRegistry.list()) {
      try {
        const status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (status.installed) {
          await managedWorkflows.uninstall(registration.id, { spaceId });
          removed.push(registration.id);
        }
      } catch (workerError) {
        // A worker that is not installed is not a failure; anything else is logged.
        this.deps.logger.warn(
          `AlertZero disable: worker "${registration.id}" not removed in space "${spaceId}": ${workerError}`
        );
      }
    }
    this.deps.logger.info(
      `AlertZero disabled in space "${spaceId}" (${removed.length} workers removed)`
    );
    return { outcome: 'disabled', spaceId, installedWorkerIds: removed };
  }
}
