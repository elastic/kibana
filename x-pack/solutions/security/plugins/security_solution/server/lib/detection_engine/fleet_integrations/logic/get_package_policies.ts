/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ListWithKuery } from '@kbn/fleet-plugin/common';
import type { EndpointInternalFleetServicesInterface } from '../../../../endpoint/services/fleet';

export async function getFleetPackagePolicies(
  fleet: EndpointInternalFleetServicesInterface,
  logger: Logger,
  options: ListWithKuery & { spaceId?: string } = {}
) {
  try {
    logger.debug('getFleetPackagePolicies: Fetching Fleet package policies');
    const soClient = fleet.savedObjects.createInternalScopedSoClient();
    const packagePolicies = await fleet.packagePolicy.list(soClient, options);
    logger.debug(
      `getFleetPackagePolicies: Fetched Fleet package policies: ${packagePolicies.total} items`
    );
    return packagePolicies;
  } catch (error) {
    logger.error(`getFleetPackagePolicies: Error fetching Fleet package policies`, error);
    throw error;
  }
}
