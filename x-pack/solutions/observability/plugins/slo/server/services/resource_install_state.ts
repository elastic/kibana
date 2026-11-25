/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LockManagerService } from '@kbn/lock-manager';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import { LOCK_ID_RESOURCE_INSTALLER } from '../../common/constants';
import { SLOResourcesNotInstalled } from '../errors';
import type { RetryOptions } from '../utils/retry';
import { DEFAULT_RETRY_OPTIONS, REQUEST_RETRY_OPTIONS } from '../utils/retry';
import type { ResourceInstaller } from './resource_installer';

const LOCK_RETRY_INTERVAL_MS = 2_000;
// Bounds how long a caller waits while another process installs the resources.
const LOCK_WAIT_TIMEOUT_MS = 30_000;
const LOCK_WAIT_TIMEOUT_MESSAGE = 'SLO resources are being installed by another process';

interface ResourceInstallStateDependencies {
  installerFactory: (retryOptions: RetryOptions) => Promise<ResourceInstaller>;
  lockManager: Pick<LockManagerService, 'withLock'>;
  logger: Logger;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Tracks, per Kibana node, whether the SLO shared resources are installed, and installs them on demand. */
export class ResourceInstallState {
  private installed = false;
  private inFlight?: Promise<void>;

  constructor(private readonly dependencies: ResourceInstallStateDependencies) {}

  // Defaults to request-bounded retries; a caller joining an in-flight install waits on that install's retries.
  public async ensureInstalled(retryOptions: RetryOptions = REQUEST_RETRY_OPTIONS): Promise<void> {
    if (this.installed) {
      return;
    }

    this.inFlight ??= this.install(retryOptions)
      .then(() => {
        this.installed = true;
      })
      .finally(() => {
        this.inFlight = undefined;
      });

    return this.inFlight;
  }

  /** Installs once without waiting for the lock; returns false when another process holds it. */
  public async reconcile(
    retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
    signal?: AbortSignal
  ): Promise<boolean> {
    try {
      const installed = await this.installUnderLock(retryOptions, signal);
      if (installed) {
        this.installed = true;
      }
      return installed;
    } catch (err) {
      // Shared resources may be gone: stop trusting the cached success so API calls re-check.
      this.installed = false;
      throw err;
    }
  }

  private async install(retryOptions: RetryOptions): Promise<void> {
    const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
    while (!(await this.withinDeadline(this.installUnderLock(retryOptions), deadline))) {
      if (Date.now() >= deadline) {
        throw new SLOResourcesNotInstalled(LOCK_WAIT_TIMEOUT_MESSAGE);
      }
      this.dependencies.logger.debug(
        'SLO resources are being installed by another process, retrying'
      );
      await sleep(LOCK_RETRY_INTERVAL_MS);
    }
  }

  // A slow lock attempt must not outlast the caller's wait budget.
  private withinDeadline(attempt: Promise<boolean>, deadline: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new SLOResourcesNotInstalled(LOCK_WAIT_TIMEOUT_MESSAGE)),
        Math.max(deadline - Date.now(), 0)
      );
    });
    return Promise.race([attempt, expired]).finally(() => clearTimeout(timer));
  }

  // Returns false when another process holds the lock. Installing again after that process is done
  // is cheap: up-to-date resources are skipped.
  private async installUnderLock(
    retryOptions: RetryOptions,
    signal?: AbortSignal
  ): Promise<boolean> {
    const { installerFactory, lockManager } = this.dependencies;
    try {
      const installer = await installerFactory(retryOptions);
      await lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () => installer.install(signal));
      return true;
    } catch (err) {
      if (isLockAcquisitionError(err)) {
        return false;
      }
      throw new SLOResourcesNotInstalled(err.message);
    }
  }
}
