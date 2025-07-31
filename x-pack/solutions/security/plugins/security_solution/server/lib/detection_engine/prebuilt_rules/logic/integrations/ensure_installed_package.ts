/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';

export async function ensureInstalledPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  pkgName: string,
  pkgVersion: string,
  logger: Logger
) {
  try {
    logger.debug(
      `ensureInstalledPackage: requesting Fleet to install package "${pkgName}" version ${pkgVersion} if it's not already installed.`
    );

    const packageInstallationResult = await context
      .getInternalFleetServices()
      .packages.ensureInstalledPackage({ pkgName: PREBUILT_RULES_PACKAGE_NAME, pkgVersion });

    logger.debug(
      `ensureInstalledPackage: "${PREBUILT_RULES_PACKAGE_NAME}" version ${pkgVersion} is ${packageInstallationResult.status}`
    );

    return packageInstallationResult;
  } catch (error) {
    logger.error(
      `ensureInstalledPackage: error installing package "${PREBUILT_RULES_PACKAGE_NAME}" version: ${pkgVersion}}`,
      error
    );
    throw error;
  }
}
