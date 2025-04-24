/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';

export async function findLatestPackageVersion(
  context: SecuritySolutionApiRequestHandlerContext,
  packageName: string
) {
  const securityAppClient = context.getAppClient();
  const packageClient = context.getInternalFleetServices().packages;

  // Use prerelease versions in dev environment
  const isPrerelease =
    securityAppClient.getBuildFlavor() === 'traditional' &&
    (securityAppClient.getKibanaVersion().includes('-SNAPSHOT') ||
      securityAppClient.getKibanaBranch() === 'main');

  const result = await packageClient.fetchFindLatestPackage(packageName, {
    prerelease: isPrerelease,
  });

  return result.version;
}
