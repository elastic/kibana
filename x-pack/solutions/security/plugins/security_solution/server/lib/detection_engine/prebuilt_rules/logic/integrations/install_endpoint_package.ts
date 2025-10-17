/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EnsurePackageResult } from '@kbn/fleet-plugin/server/services/epm/packages/install';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { ENDPOINT_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { findLatestPackageVersion } from './find_latest_package_version';
import { ensureInstalledPackage } from './ensure_installed_package';

export async function installEndpointPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
): Promise<EnsurePackageResult> {
  const pkgVersion = await findLatestPackageVersion(context, ENDPOINT_PACKAGE_NAME, logger);

  return ensureInstalledPackage(context, ENDPOINT_PACKAGE_NAME, pkgVersion, logger);
}
