/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allLocationsToClientContract } from '../settings/private_locations/helpers';
import { getPrivateLocationsAndAgentPolicies } from '../settings/private_locations/get_private_locations';
import { SyntheticsRestApiRouteFactory } from '../types';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getServiceLocationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SERVICE_LOCATIONS,
  validate: {},
  handler: async ({
    request,
    server,
    savedObjectsClient,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const elasticManagedLocationsEnabled =
      Boolean(
        (
          await server.coreStart?.capabilities.resolveCapabilities(request, {
            capabilityPath: 'uptime.*',
          })
        ).uptime.elasticManagedLocationsEnabled
      ) ?? true;

    if (elasticManagedLocationsEnabled) {
      const { throttling, allLocations } = await getAllLocations({
        server,
        syntheticsMonitorClient,
        savedObjectsClient,
      });

      return {
        locations: allLocations,
        throttling,
      };
    } else {
      const { locations: privateLocations, agentPolicies } =
        await getPrivateLocationsAndAgentPolicies(savedObjectsClient, syntheticsMonitorClient);

      const result = allLocationsToClientContract({ locations: privateLocations }, agentPolicies);
      return {
        locations: result,
      };
    }
  },
});
