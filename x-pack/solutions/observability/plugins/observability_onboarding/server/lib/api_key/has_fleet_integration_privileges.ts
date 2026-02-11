/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

/**
 * Checks if the user has the required Fleet privileges to install packages.
 * This checks for the 'integrations.installPackages' privilege which is required
 * to call packageClient.ensureInstalledPackage().
 */
export async function hasFleetIntegrationPrivileges(
  request: KibanaRequest,
  fleetStart: FleetStartContract
): Promise<boolean> {
  try {
    // Get the Fleet authz for the current user
    const authz = await fleetStart.authz.fromRequest(request);

    // Check if user has permission to install packages
    // This corresponds to the INSTALL_PACKAGES_AUTHZ requirement
    return authz.integrations.installPackages === true;
  } catch (error) {
    // If there's an error checking privileges, assume no access
    return false;
  }
}
