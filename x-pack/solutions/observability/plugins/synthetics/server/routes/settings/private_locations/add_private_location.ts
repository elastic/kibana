/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { privateLocationSavedObjectName } from '../../../../common/saved_objects/private_locations';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { toClientContract, toSavedObjectContract } from './helpers';
import { PrivateLocation } from '../../../../common/runtime_types';

export const PrivateLocationSchema = schema.object({
  label: schema.string(),
  agentPolicyId: schema.string(),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  geo: schema.maybe(
    schema.object({
      lat: schema.number(),
      lon: schema.number(),
    })
  ),
  spaces: schema.maybe(
    schema.arrayOf(schema.string(), {
      minSize: 1,
    })
  ),
});

export type PrivateLocationObject = TypeOf<typeof PrivateLocationSchema>;

export const addPrivateLocationRoute: SyntheticsRestApiRouteFactory<PrivateLocation> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  validation: {
    request: {
      body: PrivateLocationSchema,
    },
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { response, request, savedObjectsClient, syntheticsMonitorClient, server } = routeContext;
    const internalSOClient = server.coreStart.savedObjects.createInternalRepository();

    await migrateLegacyPrivateLocations(internalSOClient, server.logger);

    const location = request.body as PrivateLocationObject;

    const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );

    if (locations.find((loc) => loc.agentPolicyId === location.agentPolicyId)) {
      return response.badRequest({
        body: {
          message: `Private location with agentPolicyId ${location.agentPolicyId} already exists`,
        },
      });
    }

    // return if name is already taken
    if (locations.find((loc) => loc.label === location.label)) {
      return response.badRequest({
        body: {
          message: `Private location with label ${location.label} already exists`,
        },
      });
    }

    const formattedLocation = toSavedObjectContract({
      ...location,
      id: location.agentPolicyId,
    });

    const agentPolicy = agentPolicies?.find((policy) => policy.id === location.agentPolicyId);
    if (!agentPolicy) {
      return response.badRequest({
        body: {
          message: `Agent policy with id ${location.agentPolicyId} does not exist`,
        },
      });
    }

    const soClient = routeContext.server.coreStart.savedObjects.createInternalRepository();

    const { spaces } = location;

    const result = await soClient.create<PrivateLocationAttributes>(
      privateLocationSavedObjectName,
      formattedLocation,
      {
        id: location.agentPolicyId,
        initialNamespaces: isEmpty(spaces) || spaces?.includes('*') ? ['*'] : spaces,
      }
    );

    return toClientContract(result, agentPolicies);
  },
});
