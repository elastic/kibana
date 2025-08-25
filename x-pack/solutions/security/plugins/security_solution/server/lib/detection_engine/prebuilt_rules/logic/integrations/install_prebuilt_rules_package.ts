/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EnsurePackageResult } from '@kbn/fleet-plugin/server/services/epm/packages/install';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { findLatestPackageVersion } from './find_latest_package_version';
import { ensureInstalledPackage } from './ensure_installed_package';

/**
 * Installs the prebuilt rules package of the config's specified or latest version.
 *
 * @param config Kibana config
 * @param context Request handler context
 */
export async function installPrebuiltRulesPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
): Promise<EnsurePackageResult> {
  const config = context.getConfig();
  let pkgVersion = config.prebuiltRulesPackageVersion;

  if (!pkgVersion) {
    logger.debug(`installPrebuiltRulesPackage: no package version specified in config.`);
    pkgVersion = await findLatestPackageVersion(context, PREBUILT_RULES_PACKAGE_NAME, logger);
  } else {
    logger.debug(`installPrebuiltRulesPackage: package version specified in config: ${pkgVersion}`);
  }

  return ensureInstalledPackage(context, PREBUILT_RULES_PACKAGE_NAME, pkgVersion, logger);
}
