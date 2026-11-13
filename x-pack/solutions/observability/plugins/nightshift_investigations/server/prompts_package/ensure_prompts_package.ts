/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

export const NIGHTSHIFT_PROMPTS_PACKAGE_NAME = 'nightshift_prompts';

/** How often a Kibana node asks the registry for a newer `nightshift_prompts` version. */
export const PROMPTS_PACKAGE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const isPackageNotFound = (error: unknown): boolean =>
  error instanceof Error && error.name === 'PackageNotFoundError';

/**
 * Returns a function that installs or upgrades the `nightshift_prompts` package in the background,
 * at most once per interval. Fleet resolves the latest version compatible with this Kibana.
 */
export const createPromptsPackageInstaller = ({
  getFleet,
  logger,
  intervalMs = PROMPTS_PACKAGE_CHECK_INTERVAL_MS,
  now = Date.now,
}: {
  getFleet: () => Pick<FleetStartContract, 'fleetSetupCompleted' | 'packageService'> | undefined;
  logger: Logger;
  intervalMs?: number;
  now?: () => number;
}): (() => void) => {
  let lastAttemptAt: number | undefined;

  const ensure = async (): Promise<void> => {
    const fleet = getFleet();
    if (!fleet) {
      return;
    }
    await fleet.fleetSetupCompleted();
    const { status } = await fleet.packageService.asInternalUser.ensureInstalledPackage({
      pkgName: NIGHTSHIFT_PROMPTS_PACKAGE_NAME,
    });
    logger.debug(`Prompts package "${NIGHTSHIFT_PROMPTS_PACKAGE_NAME}" is ${status}`);
  };

  return () => {
    const attemptAt = now();
    if (lastAttemptAt !== undefined && attemptAt - lastAttemptAt < intervalMs) {
      return;
    }
    lastAttemptAt = attemptAt;
    ensure().catch((error) => {
      // Air-gapped deployments, or registries without the package yet, keep the bundled prompts.
      const message = `Failed to install prompts package "${NIGHTSHIFT_PROMPTS_PACKAGE_NAME}": ${error.message}`;
      if (isPackageNotFound(error)) {
        logger.debug(message);
      } else {
        logger.warn(message);
      }
    });
  };
};
