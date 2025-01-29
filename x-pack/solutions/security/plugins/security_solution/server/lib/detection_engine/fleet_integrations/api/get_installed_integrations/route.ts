/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import type { GetInstalledIntegrationsResponse } from '../../../../../../common/api/detection_engine/fleet_integrations';
import { GET_INSTALLED_INTEGRATIONS_URL } from '../../../../../../common/api/detection_engine/fleet_integrations';
import { createInstalledIntegrationSet } from './installed_integration_set';

/**
 * Returns an array of installed Fleet integrations and their packages.
 */
export const getInstalledIntegrationsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_INSTALLED_INTEGRATIONS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'securitySolution']);
          const fleet = ctx.securitySolution.getInternalFleetServices();
          const set = createInstalledIntegrationSet();

          // Pulls all packages into memory just like the main fleet landing page
          // No pagination support currently, so cannot batch this call
          const allThePackages = await fleet.packages.getPackages();
          allThePackages.forEach((fleetPackage) => {
            set.addPackage(fleetPackage);
          });

          const packagePolicies = await fleet.packagePolicy.list(
            fleet.savedObjects.createInternalScopedSoClient(),
            {}
          );
          packagePolicies.items.forEach((policy) => {
            set.addPackagePolicy(policy);
          });

          const installedIntegrations = set.getIntegrations();

          const body: GetInstalledIntegrationsResponse = {
            installed_integrations: installedIntegrations,
          };

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
