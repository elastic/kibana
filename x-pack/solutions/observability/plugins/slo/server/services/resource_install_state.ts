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
import type { ResourceInstaller } from './resource_installer';

const LOCK_RETRY_INTERVAL_MS = 2_000;
// Bounds how long a caller waits while another process installs the resources.
const LOCK_WAIT_TIMEOUT_MS = 30_000;

interface ResourceInstallStateDependencies {
  installerFactory: () => Promise<ResourceInstaller>;
  lockManager: Pick<LockManagerService, 'withLock'>;
  logger: Logger;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Tracks, per Kibana node, whether the SLO shared resources are installed, and installs them on demand. */
export class ResourceInstallState {
  private installed = false;
  private inFlight?: Promise<void>;

  constructor(private readonly dependencies: ResourceInstallStateDependencies) {}

  public async ensureInstalled(): Promise<void> {
    if (this.installed) {
      return;
    }

    this.inFlight ??= this.install()
      .then(() => {
        this.installed = true;
      })
      .finally(() => {
        this.inFlight = undefined;
      });

    return this.inFlight;
  }

  private async install(): Promise<void> {
    const { installerFactory, logger } = this.dependencies;

    try {
      const installer = await installerFactory();
      const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
      while (!(await this.installUnderLock(installer))) {
        if (Date.now() >= deadline) {
          throw new SLOResourcesNotInstalled(
            'SLO resources are being installed by another process'
          );
        }
        logger.debug('SLO resources are being installed by another process, retrying');
        await sleep(LOCK_RETRY_INTERVAL_MS);
      }
    } catch (err) {
      if (err instanceof SLOResourcesNotInstalled) {
        throw err;
      }
      throw new SLOResourcesNotInstalled(`Failed to install SLO resources: ${err.message}`);
    }
  }

  // Returns false when another process holds the lock. Installing again after that process is done
  // is cheap: up-to-date resources are skipped.
  private async installUnderLock(installer: ResourceInstaller): Promise<boolean> {
    try {
      await this.dependencies.lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () =>
        installer.install()
      );
      return true;
    } catch (err) {
      if (isLockAcquisitionError(err)) {
        return false;
      }
      throw err;
    }
  }
}
