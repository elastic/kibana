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

const VERIFY_INTERVAL_MS = 2_000;
// Matches the lock manager default TTL.
const VERIFY_TIMEOUT_MS = 30_000;

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
    const { installerFactory, lockManager, logger } = this.dependencies;

    try {
      const installer = await installerFactory();
      try {
        await lockManager.withLock(LOCK_ID_RESOURCE_INSTALLER, () => installer.install());
      } catch (err) {
        if (!isLockAcquisitionError(err)) {
          throw err;
        }

        logger.debug('SLO resources are being installed by another process, verifying them');
        if (!(await this.waitUntilVerified(installer))) {
          throw new SLOResourcesNotInstalled(
            'SLO resources are being installed by another process and could not be verified'
          );
        }
      }
    } catch (err) {
      if (err instanceof SLOResourcesNotInstalled) {
        throw err;
      }
      throw new SLOResourcesNotInstalled(`Failed to install SLO resources: ${err.message}`);
    }
  }

  private async waitUntilVerified(installer: ResourceInstaller): Promise<boolean> {
    const maxAttempts = Math.floor(VERIFY_TIMEOUT_MS / VERIFY_INTERVAL_MS);
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(VERIFY_INTERVAL_MS);
      }
      if (await installer.verify()) {
        return true;
      }
    }
    return false;
  }
}
