/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
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
    const { response, request, server } = routeContext;
    const internalSOClient = server.coreStart.savedObjects.createInternalRepository();
    await migrateLegacyPrivateLocations(internalSOClient, server.logger);

    const repo = new PrivateLocationRepository(routeContext);

    const invalidError = await repo.validatePrivateLocation();
    if (invalidError) {
      return invalidError;
    }

    const location = request.body as PrivateLocationObject;
    const newId = uuidV4();
    const formattedLocation = toSavedObjectContract({ ...location, id: newId });
    const { spaces } = location;

    try {
      const result = await repo.createPrivateLocation(formattedLocation, newId);

      return toClientContract(result);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
        if (spaces?.includes('*')) {
          return response.badRequest({
            body: {
              message: `You do not have permission to create a location in all spaces.`,
            },
          });
        }
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
