/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type { SyntheticsServerSetup } from '../../../types';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, toSavedObjectContract } from './helpers';
import { assertCanEnableAgentSharding } from './agent_sharding_license';
import { MAX_ROUTE_ID_LENGTH } from '../../zod_query';
import type { PrivateLocation } from '../../../../common/runtime_types';

export const PrivateLocationSchema = z.object({
  label: z.string().min(1).max(MAX_ROUTE_ID_LENGTH),
  agentPolicyId: z.string().min(1).max(MAX_ROUTE_ID_LENGTH),
  tags: z.array(z.string().max(256)).max(100).optional(),
  geo: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  spaces: z.array(z.string().max(256)).max(100).optional(),
  isAgentSharding: z.boolean().optional(),
});

export type PrivateLocationObject = z.infer<typeof PrivateLocationSchema>;

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
    const { response, request, server, spaceId, context } = routeContext;
    const location = request.body as PrivateLocationObject;
    const licenseError = assertCanEnableAgentSharding(
      (await context.licensing).license,
      location.isAgentSharding
    );
    if (licenseError) {
      return response.forbidden({ body: { message: licenseError } });
    }

    const internalSOClient = server.coreStart.savedObjects.createInternalRepository();
    const { agentPolicy, validationError } = await validateAgentPolicy(
      server,
      location.agentPolicyId,
      spaceId
    );

    if (!agentPolicy) {
      return response.badRequest({
        body: {
          message: validationError!,
        },
      });
    }

    const agentPolicySpaces = getAgentPolicySpaceIds(agentPolicy);

    const newId = uuidV4();
    const repo = new PrivateLocationRepository(routeContext);
    const formattedLocation = toSavedObjectContract({
      ...location,
      id: newId,
      spaces: repo.getLocationSpaces({ agentPolicySpaces, locationSpaces: location.spaces }),
    });

    if (
      !agentPolicySpaces.includes(ALL_SPACES_ID) &&
      formattedLocation.spaces &&
      !formattedLocation.spaces.every((s) => agentPolicySpaces.includes(s))
    ) {
      return response.badRequest({
        body: {
          message: `Invalid spaces. Private location spaces [${location.spaces?.join(
            ', '
          )}] must be fully contained within agent policy ${
            location.agentPolicyId
          } spaces [${agentPolicySpaces.join(', ')}].`,
        },
      });
    }
    await migrateLegacyPrivateLocations(internalSOClient, server.logger);

    const invalidError = await repo.validatePrivateLocation({ agentPolicySpaces, spaceId });
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

const validateAgentPolicy = async (
  server: SyntheticsServerSetup,
  agentPolicyId: string,
  spaceId: string
) => {
  const internalSOClient = server.coreStart.savedObjects.createInternalRepository();
  try {
    return {
      agentPolicy: await server.fleet?.agentPolicyService.get(
        internalSOClient,
        agentPolicyId,
        false,
        {
          spaceId,
        }
      ),
    };
  } catch (error) {
    return {
      validationError: `Agent policy with id ${agentPolicyId} not found in space ${spaceId}, please use an agent policy available in current space.`,
    };
  }
};

export const getAgentPolicySpaceIds = (agentPolicy: AgentPolicy) => {
  const spaceIds = agentPolicy.space_ids;
  // When Fleet space awareness is off (e.g. basic license) agent policies have
  // `space_ids: []`. A non-space-aware policy is available everywhere, so treat
  // it the same as an undefined value and map it to all spaces.
  if (!spaceIds || spaceIds.length === 0 || spaceIds.includes(ALL_SPACES_ID)) {
    return [ALL_SPACES_ID];
  }
  return spaceIds;
};
