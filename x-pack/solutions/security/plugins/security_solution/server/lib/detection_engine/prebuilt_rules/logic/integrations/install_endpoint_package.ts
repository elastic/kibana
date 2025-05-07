/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { ENDPOINT_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { findLatestPackageVersion } from './find_latest_package_version';

export async function installEndpointPackage(context: SecuritySolutionApiRequestHandlerContext) {
  const pkgVersion = await findLatestPackageVersion(context, ENDPOINT_PACKAGE_NAME);

  return context.getInternalFleetServices().packages.ensureInstalledPackage({
    pkgName: ENDPOINT_PACKAGE_NAME,
    pkgVersion,
  });
}
