/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { z } from '@kbn/zod';
import { routeId } from '../../zod_query';
import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import type { AgentPolicyInfo } from '../../../../common/types';
import type {
  RouteContext,
  SyntheticsRestApiRouteFactory,
  SyntheticsRouteHandler,
} from '../../types';
import type { PrivateLocation, SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';
import type { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { allLocationsToClientContract } from './helpers';

const loadPrivateLocations = async ({
  savedObjectsClient,
  syntheticsMonitorClient,
  server,
}: RouteContext): Promise<SyntheticsPrivateLocations> => {
  const internalSOClient = server.coreStart.savedObjects.createInternalRepository();
  await migrateLegacyPrivateLocations(internalSOClient, server.logger);

  const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
    savedObjectsClient,
    syntheticsMonitorClient
  );
  return allLocationsToClientContract({ locations }, agentPolicies);
};

const getPrivateLocationsHandler: SyntheticsRouteHandler<SyntheticsPrivateLocations> = async (
  routeContext
) => loadPrivateLocations(routeContext);

const getPrivateLocationHandler: SyntheticsRouteHandler<
  PrivateLocation,
  { locationId: string }
> = async (routeContext) => {
  const { request, response } = routeContext;
  const { locationId: id } = request.params;

  const list = await loadPrivateLocations(routeContext);
  const location = list.find((loc) => loc.id === id || loc.label === id);
  if (!location) {
    return response.notFound({
      body: {
        message: `Private location with id or label "${id}" not found`,
      },
    });
  }
  return location;
};

export const getPrivateLocationsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsPrivateLocations
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  handler: getPrivateLocationsHandler,
});

export const getPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  PrivateLocation,
  { locationId: string }
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}',
  validate: {},
  validation: {
    request: {
      params: z.strictObject({
        locationId: routeId,
      }),
    },
  },
  handler: getPrivateLocationHandler,
});

export const getPrivateLocationsAndAgentPolicies = async (
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  excludeAgentPolicies = false,
  spaceId: string = ALL_SPACES_ID
): Promise<SyntheticsPrivateLocationsAttributes & { agentPolicies: AgentPolicyInfo[] }> => {
  try {
    const [privateLocations, agentPolicies] = await Promise.all([
      getPrivateLocations(savedObjectsClient),
      excludeAgentPolicies
        ? new Promise<void>((resolve) => resolve())
        : syntheticsMonitorClient.privateLocationAPI.getAgentPolicies(spaceId),
    ]);
    return {
      locations: privateLocations || [],
      agentPolicies: agentPolicies || [],
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { locations: [], agentPolicies: [] };
    }
    throw error;
  }
};
