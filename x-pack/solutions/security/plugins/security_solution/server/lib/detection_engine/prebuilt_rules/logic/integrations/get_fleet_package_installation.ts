/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EndpointInternalFleetServicesInterface } from '../../../../../endpoint/services/fleet';

export function getFleetPackageInstallation(
  fleet: EndpointInternalFleetServicesInterface,
  integrationName: string,
  logger: Logger
) {
  try {
    logger.debug(
      `getFleetPackageInstallation: Fetching Fleet package installation for integration: "${integrationName}"`
    );
    const packageInstallation = fleet.packages.getInstallation(integrationName);
    logger.debug(
      `getFleetPackageInstallation: Fetched Fleet package installation for integration: "${integrationName}"`
    );
    return packageInstallation;
  } catch (error) {
    logger.error(
      `getFleetPackageInstallation: Error fetching Fleet package installation for integration: "${integrationName}"`,
      error
    );
    throw error;
  }
}
