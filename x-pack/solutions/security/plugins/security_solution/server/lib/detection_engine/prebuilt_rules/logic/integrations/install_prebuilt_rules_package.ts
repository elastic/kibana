/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { findLatestPackageVersion } from './find_latest_package_version';

/**
 * Installs the prebuilt rules package of the config's specified or latest version.
 *
 * @param config Kibana config
 * @param context Request handler context
 */
export async function installPrebuiltRulesPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  logDebug: (message: string) => void = (message: string) => {}
) {
  const config = context.getConfig();
  let pkgVersion = config.prebuiltRulesPackageVersion;

  logDebug(`INSTALL PREBUILT RULES PACKAGE - package version in config: ${pkgVersion}`);

  if (!pkgVersion) {
    // Find latest package if the version isn't specified in the config
    pkgVersion = await findLatestPackageVersion(context, PREBUILT_RULES_PACKAGE_NAME);
  }

  logDebug(`INSTALL PREBUILT RULES PACKAGE - installing package version: ${pkgVersion}`);

  const packageInstallationResult = await context
    .getInternalFleetServices()
    .packages.ensureInstalledPackage({ pkgName: PREBUILT_RULES_PACKAGE_NAME, pkgVersion });

  logDebug(
    `INSTALL PREBUILT RULES PACKAGE - installation result: ${JSON.stringify(
      packageInstallationResult
    )}`
  );

  return packageInstallationResult;
}
