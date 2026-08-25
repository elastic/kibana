/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EnsurePackageResult } from '@kbn/fleet-plugin/server/services/epm/packages/install';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';

export async function ensureInstalledPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  pkgName: string,
  pkgVersion: string,
  logger: Logger
): Promise<EnsurePackageResult> {
  try {
    logger.debug(
      `ensureInstalledPackage: Ensuring Fleet package is installed: "${pkgName}" v${pkgVersion}`
    );

    const packageInstallationResult = await context
      .getInternalFleetServices()
      .packages.ensureInstalledPackage({ pkgName, pkgVersion });

    logger.info(
      `ensureInstalledPackage: Fleet package is ${packageInstallationResult.status}: "${pkgName}" v${pkgVersion}`
    );

    return packageInstallationResult;
  } catch (error) {
    logger.error(
      `ensureInstalledPackage: Error ensuring Fleet package is installed: "${pkgName}" v${pkgVersion}}`,
      error
    );
    throw error;
  }
}
