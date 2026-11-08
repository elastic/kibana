/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import path from 'path';
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

const getPrivateLocationHandler: SyntheticsRouteHandler<PrivateLocation, { id: string }> = async (
  routeContext
) => {
  const { request, response } = routeContext;
  const { id } = request.params;

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
  options: {
    summary: 'Get private locations',
    description:
      'Get a list of private locations.\n\nYou must have `read` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.',
    operationId: 'get-private-locations',
    oasOperationObject: () => path.join(__dirname, 'examples/get_private_locations.yaml'),
  },
  validate: {},
  handler: getPrivateLocationsHandler,
});

export const getPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  PrivateLocation,
  { id: string }
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{id}',
  options: {
    summary: 'Get a private location',
    description:
      'You must have `read` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.',
    operationId: 'get-private-location',
    oasOperationObject: () => path.join(__dirname, 'examples/get_private_location.yaml'),
  },
  validate: {},
  validation: {
    request: {
      params: z.strictObject({
        id: routeId.describe('A private location identifier or label.'),
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
