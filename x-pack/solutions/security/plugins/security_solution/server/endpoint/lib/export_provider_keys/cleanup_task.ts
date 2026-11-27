/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
// Subpaths: the endpoint Jest config maps `@kbn/task-manager-plugin/server` to a mock without these
import { TaskCost } from '@kbn/task-manager-plugin/server/task';
import { throwRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import type { Logger } from '@kbn/logging';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { getExportProviderKeyIds } from '../../../../common/endpoint/models/export_providers';
import { EndpointError } from '../../../../common/endpoint/errors';
import type { EndpointAppContext } from '../../types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { EndpointInternalFleetServicesInterface } from '../../services/fleet';
import { EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE, EXPORT_PROVIDER_KEY_MIN_AGE_MS } from './constants';
import type { ExportProviderKeyClientInterface, ExportProviderKeyMetadata } from './types';

export const EXPORT_PROVIDER_KEY_CLEANUP_TASK_TITLE =
  'Security Solution Export Provider Key Cleanup';
export const EXPORT_PROVIDER_KEY_CLEANUP_TASK_DESCRIPTION =
  "Deletes export provider key objects that no package policy's provider references any more.";

const TASK_TIMEOUT = '5m';
const TASK_INTERVAL = '1h';
const FIND_ALL_KEYS_PER_PAGE = 100;

/** A key object this old, or older, is a cleanup candidate (`EXPORT_PROVIDER_KEY_MIN_AGE_MS`). */
const isOldEnoughToClean = (createdAt: string, now: number): boolean => {
  const createdAtMs = Date.parse(createdAt);

  // An unparsable `created_at` can never become "young enough" to keep around, so it is treated
  // as old rather than risking an export provider key object that lingers forever.
  if (Number.isNaN(createdAtMs)) {
    return true;
  }

  return now - createdAtMs >= EXPORT_PROVIDER_KEY_MIN_AGE_MS;
};

/** Whether `owner`'s providers (any OS) still reference `keyId`. Tolerates a malformed value. */
const isStillReferencedBy = (owner: PackagePolicy, keyId: string): boolean => {
  const policyValue = owner.inputs?.[0]?.config?.policy?.value as PolicyConfig | undefined;

  if (!policyValue) {
    return false;
  }

  return getExportProviderKeyIds(policyValue).has(keyId);
};

/**
 * Deletes the `candidates` whose owner package policy is gone from every space or no longer
 * references them, and returns how many were deleted. Deletes nothing when the owners can't be read.
 */
const deleteUnreferencedKeys = async ({
  candidates,
  fleetServices,
  keyClient,
  logger,
}: {
  candidates: ExportProviderKeyMetadata[];
  fleetServices: EndpointInternalFleetServicesInterface;
  keyClient: ExportProviderKeyClientInterface;
  logger: Logger;
}): Promise<number> => {
  if (candidates.length === 0) {
    return 0;
  }

  const ownerIds = [...new Set(candidates.map((key) => key.package_policy_id))];
  let owners: PackagePolicy[];

  try {
    owners = await fleetServices.packagePolicy.getByIDs(fleetServices.getSoClient(), ownerIds, {
      ignoreMissing: true,
      spaceIds: ['*'],
    });
  } catch (error) {
    logger.warn(
      `Export provider key cleanup: failed to read the owner package policies [${ownerIds.join(
        ', '
      )}]; skipping [${candidates.length}] candidate key object(s) of this batch: ${error.message}`
    );
    return 0;
  }

  const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
  const toDelete = candidates.filter((key) => {
    const owner = ownersById.get(key.package_policy_id);
    return !owner || !isStillReferencedBy(owner, key.id);
  });

  if (toDelete.length === 0) {
    return 0;
  }

  return (await keyClient.deleteKeys(toDelete)).length;
};

export interface RunExportProviderKeyCleanupOptions {
  endpointService: EndpointAppContextService;
  logger: Logger;
  /** Epoch ms used to evaluate `created_at` against `EXPORT_PROVIDER_KEY_MIN_AGE_MS` */
  now: number;
  signal: AbortSignal;
}

/**
 * Deletes export provider key objects whose owner package policy no longer exists in any space,
 * or no longer references them. Paged, so a batch's failure (e.g. a Fleet read error) only skips
 * that batch; the run continues with the next one. Stops early when `signal` is aborted.
 */
export const runExportProviderKeyCleanup = async ({
  endpointService,
  logger,
  now,
  signal,
}: RunExportProviderKeyCleanupOptions): Promise<void> => {
  const keyClient = endpointService.getExportProviderKeyClient();
  // Unscoped and un-spaced: an owner that only still exists in another space must be found too.
  const fleetServices = endpointService.getInternalFleetServices(undefined, true);

  let scanned = 0;
  let deleted = 0;

  for await (const batch of keyClient.findAllKeys({ perPage: FIND_ALL_KEYS_PER_PAGE })) {
    if (signal.aborted) {
      break;
    }

    const deletedInBatch = await deleteUnreferencedKeys({
      candidates: batch.filter((key) => isOldEnoughToClean(key.created_at, now)),
      fleetServices,
      keyClient,
      logger,
    });

    scanned += batch.length;
    deleted += deletedInBatch;
  }

  logger.debug(
    () =>
      `Export provider key cleanup: scanned [${scanned}] key object(s), deleted [${deleted}] unreferenced one(s)`
  );
};

export interface ExportProviderKeyCleanupTaskConstructorOptions {
  endpointAppContext: EndpointAppContext;
}

/**
 * Task Manager task that periodically deletes export provider key objects nothing references any
 * more. Scheduled only with the `responseActionsEndpointFileExport` feature flag on; the definition
 * is always registered, so once scheduled the task keeps running after the flag is turned off and
 * still cleans up the keys created while it was on.
 */
export class ExportProviderKeyCleanupTask {
  private readonly log: Logger;
  private wasSetup = false;
  private wasStarted = false;

  constructor(private readonly options: ExportProviderKeyCleanupTaskConstructorOptions) {
    this.log = this.options.endpointAppContext.logFactory.get(
      EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE
    );
  }

  public setup({ taskManager }: { taskManager: TaskManagerSetupContract }): void {
    if (this.wasSetup) {
      throw new Error('Task has already been setup!');
    }

    this.wasSetup = true;

    taskManager.registerTaskDefinitions({
      [EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE]: {
        title: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TITLE,
        description: EXPORT_PROVIDER_KEY_CLEANUP_TASK_DESCRIPTION,
        timeout: TASK_TIMEOUT,
        cost: TaskCost.Normal,
        // One-off transient failures (e.g. a Fleet read error) get a few retries within the hour;
        // the recurring schedule picks the work back up regardless at the next run.
        maxAttempts: 3,
        createTaskRunner: ({ signal }) => ({
          run: async () => {
            try {
              await runExportProviderKeyCleanup({
                endpointService: this.options.endpointAppContext.service,
                logger: this.log,
                now: Date.now(),
                signal,
              });
            } catch (error) {
              throwRetryableError(
                new EndpointError(`Export provider key cleanup failed: ${error.message}`, error),
                true
              );
            }

            return { state: {} };
          },
        }),
      },
    });
  }

  public async start({ taskManager }: { taskManager: TaskManagerStartContract }): Promise<void> {
    if (this.wasStarted) {
      throw new Error('Task has already been started!');
    }

    this.wasStarted = true;

    if (!this.options.endpointAppContext.experimentalFeatures.responseActionsEndpointFileExport) {
      return;
    }

    try {
      await taskManager.ensureScheduled({
        id: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE,
        taskType: EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TASK_INTERVAL,
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.log.error(new EndpointError(`Error scheduling task, received: ${e.message}`, e));
    }
  }

  /**
   * Doesn't remove the scheduled task: with several Kibana nodes, one node stopping would stop the
   * cleanup for all of them until a restart.
   */
  public async stop(): Promise<void> {
    this.wasSetup = false;
    this.wasStarted = false;

    this.log.debug(`Task [${EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE}] has been stopped`);
  }
}
