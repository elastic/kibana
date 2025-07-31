/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';

export async function findLatestPackageVersion(
  context: SecuritySolutionApiRequestHandlerContext,
  packageName: string,
  logger: Logger
) {
  const securityAppClient = context.getAppClient();
  const packageClient = context.getInternalFleetServices().packages;

  // Use prerelease versions in dev environment
  const isPrerelease =
    securityAppClient.getBuildFlavor() === 'traditional' &&
    (securityAppClient.getKibanaVersion().includes('-SNAPSHOT') ||
      securityAppClient.getKibanaBranch() === 'main');

  try {
    logger.debug(
      `fetchFindLatestPackage: Querying Fleet for latest available version of package "${packageName}" with prerelease=${isPrerelease}`
    );
    const result = await packageClient.fetchFindLatestPackage(packageName, {
      prerelease: isPrerelease,
    });

    logger.debug(
      `fetchFindLatestPackage: Found latest version ${result.version} for package "${packageName}" with prerelease=${isPrerelease}`
    );

    return result.version;
  } catch (error) {
    logger.error(
      `fetchFindLatestPackage: Error finding latest package version for "${packageName}" with prerelease=${isPrerelease}`,
      error
    );
    throw error;
  }
}
