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
import { isAbortError } from '../utils/with_deadline';
import { DEFAULT_RETRY_OPTIONS, REQUEST_RETRY_OPTIONS } from '../utils/retry';
import type { ResourceInstaller } from './resource_installer';

const LOCK_RETRY_INTERVAL_MS = 2_000;
// Bounds how long a caller waits while another process installs the resources.
const LOCK_WAIT_TIMEOUT_MS = 30_000;
const INSTALL_FAILED_MESSAGE = 'SLO resources are not installed yet, try again later';
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
    // Monotonic clock: a wall-clock jump must not shorten or extend the lock wait.
    const deadline = performance.now() + LOCK_WAIT_TIMEOUT_MS;
    while (!(await this.installWithinLockWait(retryOptions, deadline))) {
      if (performance.now() >= deadline) {
        throw new SLOResourcesNotInstalled(LOCK_WAIT_TIMEOUT_MESSAGE);
      }
      this.dependencies.logger.debug(
        'SLO resources are being installed by another process, retrying'
      );
      await sleep(LOCK_RETRY_INTERVAL_MS);
    }
  }

  // The deadline bounds only the wait for the lock: once this node holds it, the install runs to completion.
  private installWithinLockWait(retryOptions: RetryOptions, deadline: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lockWaitExpired = false;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => {
          lockWaitExpired = true;
          reject(new SLOResourcesNotInstalled(LOCK_WAIT_TIMEOUT_MESSAGE));
        },
        Math.max(deadline - performance.now(), 0)
      );
    });
    const attempt = this.installUnderLock(retryOptions, undefined, {
      onLockAcquired: () => {
        clearTimeout(timer);
        // An abandoned attempt that acquires the lock late must not install.
        if (lockWaitExpired || performance.now() >= deadline) {
          throw new SLOResourcesNotInstalled(LOCK_WAIT_TIMEOUT_MESSAGE);
        }
      },
    });
    return Promise.race([attempt, expired]).finally(() => clearTimeout(timer));
  }

  // Returns false when another process holds the lock. Installing again after that process is done
  // is cheap: up-to-date resources are skipped.
  private async installUnderLock(
    retryOptions: RetryOptions,
    signal?: AbortSignal,
    { onLockAcquired }: { onLockAcquired?: () => void } = {}
  ): Promise<boolean> {
    const { installerFactory, lockManager } = this.dependencies;
    try {
      const installer = await installerFactory(retryOptions);
      await lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () => {
        onLockAcquired?.();
        return installer.install(signal);
      });
      return true;
    } catch (err) {
      if (isLockAcquisitionError(err)) {
        return false;
      }
      // A cancellation is not an install failure: callers handle it separately. ES can also raise an
      // abort error on its own (e.g. maxResponseSize), which is a real failure.
      if (err instanceof SLOResourcesNotInstalled || (signal?.aborted && isAbortError(err))) {
        throw err;
      }
      // The detail stays in the logs; API clients only get a generic message.
      this.dependencies.logger.warn(`Failed to install SLO resources: ${err.message}`);
      throw new SLOResourcesNotInstalled(INSTALL_FAILED_MESSAGE);
    }
  }
}
