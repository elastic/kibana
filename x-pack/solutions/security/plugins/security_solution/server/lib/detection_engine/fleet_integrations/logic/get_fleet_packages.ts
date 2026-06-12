/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EndpointInternalFleetServicesInterface } from '../../../../endpoint/services/fleet';

export async function getFleetPackages(
  fleet: EndpointInternalFleetServicesInterface,
  logger: Logger
) {
  try {
    logger.debug('getFleetPackages: Fetching Fleet packages');
    const packages = await fleet.packages.getPackages();
    logger.debug(`getFleetPackages: Fetched Fleet packages: ${packages.length} items`);
    return packages;
  } catch (error) {
    logger.error(`getFleetPackages: Error fetching Fleet packages`, error);
    throw error;
  }
}
