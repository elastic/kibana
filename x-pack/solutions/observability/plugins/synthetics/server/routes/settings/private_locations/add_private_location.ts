/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, toSavedObjectContract } from './helpers';
import type { PrivateLocation } from '../../../../common/runtime_types';

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
    const { response, request, server } = routeContext;
    const internalSOClient = server.coreStart.savedObjects.createInternalRepository();
    const location = request.body as PrivateLocationObject;
    const agentPolicy = await server.fleet?.agentPolicyService.get(
      internalSOClient,
      location.agentPolicyId
    );

    if (!agentPolicy) {
      return response.badRequest({
        body: {
          message: `Agent policy with id ${location.agentPolicyId} not found, this should never happen`,
        },
      });
    }

    const policySpaces =
      agentPolicy.space_ids && agentPolicy.space_ids.length > 0
        ? agentPolicy.space_ids
        : [agentPolicy.namespace];

    const newId = uuidV4();
    const formattedLocation = toSavedObjectContract({
      ...location,
      id: newId,
      spaces: location.spaces || policySpaces,
    });

    if (!formattedLocation.spaces!.every((s) => policySpaces.includes(s))) {
      return response.badRequest({
        body: {
          message: `Invalid spaces. Private location spaces [${location.spaces?.join(
            ', '
          )}] must be fully contained within agent policy ${
            location.agentPolicyId
          } spaces [${policySpaces.join(', ')}].`,
        },
      });
    }
    await migrateLegacyPrivateLocations(internalSOClient, server.logger);

    const repo = new PrivateLocationRepository(routeContext);

    const invalidError = await repo.validatePrivateLocation();
    if (invalidError) {
      return invalidError;
    }

    try {
      const result = await repo.createPrivateLocation(formattedLocation, newId);

      return toClientContract(result);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
        return response.customError({
          statusCode: error.output.statusCode,
          body: {
            message: error.message,
          },
        });
      }
      throw error;
    }
  },
});
