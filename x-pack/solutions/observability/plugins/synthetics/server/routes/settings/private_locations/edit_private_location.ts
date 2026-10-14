/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { minLengthMessage, MAX_ROUTE_ID_LENGTH, routeId } from '../../zod_query';
import {
  getPrivateLocations,
  getPrivateLocationsForNamespaces,
} from '../../../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, updatePrivateLocationMonitors } from './helpers';
import { getAgentPolicySpaceIds } from './add_private_location';
import { runTaskPerPrivateLocation } from '../../../tasks/sync_private_locations_monitors_task';
import type { PrivateLocation } from '../../../../common/runtime_types';
import { parseArrayFilters } from '../../common';
import { syntheticsMonitorSOTypes } from '../../../../common/types/saved_objects';

export const EditPrivateLocationSchema = z.strictObject({
  label: z
    .string()
    .min(1, { error: minLengthMessage(1) })
    .max(MAX_ROUTE_ID_LENGTH)
    .optional()
    .describe(
      'A new label for the private location. Monitors using this location are updated to match.'
    ),
  tags: z
    .array(z.string().max(256))
    .max(100)
    .optional()
    .describe('An array of tags to categorize the private location.'),
  agentPolicyId: z
    .string()
    .min(1, { error: minLengthMessage(1) })
    .max(MAX_ROUTE_ID_LENGTH)
    .optional()
    .describe('The ID of the agent policy to associate with the private location.'),
});

const EditPrivateLocationQuery = z.strictObject({
  id: routeId.describe('The unique identifier of the private location to update.'),
});

export type EditPrivateLocationAttributes = Pick<PrivateLocationAttributes, 'label' | 'tags'> &
  Partial<Pick<PrivateLocationAttributes, 'agentPolicyId'>>;

const isPrivateLocationLabelChanged = (oldLabel: string, newLabel?: string): newLabel is string => {
  return typeof newLabel === 'string' && oldLabel !== newLabel;
};

const isAgentPolicyIdChanged = (
  oldAgentPolicyId: string,
  newAgentPolicyId?: string
): newAgentPolicyId is string => {
  return typeof newAgentPolicyId === 'string' && oldAgentPolicyId !== newAgentPolicyId;
};

const withIntendedLabel = <T extends { id: string; label?: string }>(
  locations: T[],
  locationId: string,
  label: string
): T[] =>
  locations.map((location) => (location.id === locationId ? { ...location, label } : location));

const validateNewAgentPolicy = async ({
  routeContext,
  locationId,
  locationSpaces,
  agentPolicyId,
}: {
  routeContext: RouteContext;
  locationId: string;
  locationSpaces: string[];
  agentPolicyId: string;
}) => {
  const { server, response, spaceId } = routeContext;
  const internalSOClient = server.coreStart.savedObjects.createInternalRepository();

  const agentPolicy = await server.fleet?.agentPolicyService
    .get(internalSOClient, agentPolicyId, false, { spaceId })
    .catch(() => null);
  if (!agentPolicy) {
    return response.badRequest({
      body: {
        message: i18n.translate('xpack.synthetics.editPrivateLocation.agentPolicyNotFound', {
          defaultMessage:
            'Agent policy with id {agentPolicyId} not found in space {spaceId}, please use an agent policy available in current space.',
          values: { agentPolicyId, spaceId },
        }),
      },
    });
  }

  const agentPolicySpaces = getAgentPolicySpaceIds(agentPolicy);
  const coversLocationSpaces =
    agentPolicySpaces.includes(ALL_SPACES_ID) ||
    (!locationSpaces.includes(ALL_SPACES_ID) &&
      locationSpaces.every((space) => agentPolicySpaces.includes(space)));
  if (!coversLocationSpaces) {
    return response.badRequest({
      body: {
        message: i18n.translate('xpack.synthetics.editPrivateLocation.agentPolicySpaces', {
          defaultMessage:
            'Agent policy {agentPolicyId} must be available in all spaces of this private location [{locationSpaces}].',
          values: { agentPolicyId, locationSpaces: locationSpaces.join(', ') },
        }),
      },
    });
  }

  // Same scope as create: only locations sharing a space with this one can conflict.
  const locationsInSpaces = await getPrivateLocationsForNamespaces(
    internalSOClient,
    locationSpaces
  );
  const locationWithPolicy = locationsInSpaces.find(
    (location) => location.agentPolicyId === agentPolicyId && location.id !== locationId
  );
  if (locationWithPolicy) {
    return response.badRequest({
      body: {
        message: i18n.translate('xpack.synthetics.editPrivateLocation.agentPolicyInUse', {
          defaultMessage:
            'Agent policy {agentPolicyId} is already used by another private location in spaces [{locationSpaces}].',
          values: { agentPolicyId, locationSpaces: locationSpaces.join(', ') },
        }),
      },
    });
  }
};

const isPrivateLocationChanged = ({
  privateLocation,
  newParams,
}: {
  privateLocation: SavedObject<PrivateLocationAttributes>;
  newParams: z.infer<typeof EditPrivateLocationSchema>;
}) => {
  const isLabelChanged = isPrivateLocationLabelChanged(
    privateLocation.attributes.label,
    newParams.label
  );
  const areTagsChanged =
    Array.isArray(newParams.tags) &&
    (!privateLocation.attributes.tags ||
      (privateLocation.attributes.tags &&
        !isEqual(privateLocation.attributes.tags, newParams.tags)));

  return (
    isLabelChanged ||
    areTagsChanged ||
    isAgentPolicyIdChanged(privateLocation.attributes.agentPolicyId, newParams.agentPolicyId)
  );
};

const checkPrivileges = async ({
  routeContext,
  monitorsSpaces,
}: {
  routeContext: RouteContext;
  monitorsSpaces: string[];
}) => {
  const { request, response, server } = routeContext;

  const checkSavedObjectsPrivileges =
    server.security.authz.checkSavedObjectsPrivilegesWithRequest(request);

  const results = await Promise.all(
    syntheticsMonitorSOTypes.map((soType) =>
      checkSavedObjectsPrivileges(`saved_object:${soType}/bulk_update`, monitorsSpaces)
    )
  );

  const hasAllRequested = results.every((result) => result.hasAllRequested);

  if (!hasAllRequested) {
    return response.forbidden({
      body: {
        message: i18n.translate('xpack.synthetics.editPrivateLocation.forbidden', {
          defaultMessage:
            'You do not have sufficient permissions to update monitors in all required spaces. This private location is used by monitors in spaces where you lack update privileges.',
        }),
      },
    });
  }
};

export const editPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  PrivateLocation,
  z.infer<typeof EditPrivateLocationQuery>,
  any,
  z.infer<typeof EditPrivateLocationSchema>
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{id}',
  options: {
    summary: 'Update a private location',
    description:
      "Update an existing private location's label, tags, or agent policy.\n\nYou must have `all` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.\n\nWhen a private location's label is updated, all monitors using this location are also updated to maintain data consistency.",
    operationId: 'put-private-location',
    oasOperationObject: () => path.join(__dirname, 'examples/put_private_location.yaml'),
  },
  validate: {},
  validation: {
    request: {
      body: EditPrivateLocationSchema,
      params: EditPrivateLocationQuery,
    },
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { response, request, savedObjectsClient } = routeContext;
    const { id: locationId } = request.params;
    const {
      label: newLocationLabel,
      tags: newTags,
      agentPolicyId: newAgentPolicyId,
    } = request.body;

    const repo = new PrivateLocationRepository(routeContext);

    try {
      const { filtersStr } = parseArrayFilters({
        locations: [locationId],
      });
      const [existingLocation, monitorsInLocation] = await Promise.all([
        repo.getPrivateLocation(locationId),
        routeContext.monitorConfigRepository.findDecryptedMonitors({
          spaceId: ALL_SPACES_ID,
          filter: filtersStr,
        }),
      ]);

      let newLocation: Awaited<ReturnType<typeof repo.editPrivateLocation>> | undefined;

      if (
        isPrivateLocationChanged({ privateLocation: existingLocation, newParams: request.body })
      ) {
        const isLabelChanged = isPrivateLocationLabelChanged(
          existingLocation.attributes.label,
          newLocationLabel
        );
        const isAgentPolicyChanged = isAgentPolicyIdChanged(
          existingLocation.attributes.agentPolicyId,
          newAgentPolicyId
        );
        const label = newLocationLabel || existingLocation.attributes.label;

        if (isAgentPolicyChanged) {
          const validationResponse = await validateNewAgentPolicy({
            routeContext,
            locationId,
            locationSpaces: existingLocation.namespaces ?? [],
            agentPolicyId: newAgentPolicyId,
          });
          if (validationResponse) {
            return validationResponse;
          }
        }

        if ((isLabelChanged || isAgentPolicyChanged) && monitorsInLocation.length) {
          const privilegeResponse = await checkPrivileges({
            routeContext,
            monitorsSpaces: [
              ...new Set(monitorsInLocation.flatMap(({ namespaces }) => namespaces ?? [])),
            ],
          });
          if (privilegeResponse) {
            return privilegeResponse;
          }
        }

        // The label is stored on each monitor, so rewrite monitors before persisting:
        // generateNewPolicy reads the in-memory location list, so overlay the new label.
        // A failed rewrite must not leave the location changed.
        if (isLabelChanged) {
          const storedLocations = await getPrivateLocations(savedObjectsClient);
          await updatePrivateLocationMonitors({
            locationId,
            newLocationLabel,
            allPrivateLocations: withIntendedLabel(storedLocations, locationId, label),
            routeContext,
            monitorsInLocation,
          });
        }

        const tags = newTags || existingLocation.attributes.tags;
        newLocation = await repo.editPrivateLocation(locationId, {
          label,
          tags,
          ...(isAgentPolicyChanged ? { agentPolicyId: newAgentPolicyId } : {}),
        });

        // The task syncs package policies to the saved location, so it must run after the save.
        if (isAgentPolicyChanged && monitorsInLocation.length) {
          await runTaskPerPrivateLocation({
            server: routeContext.server,
            privateLocationId: locationId,
            previousAgentPolicyId: existingLocation.attributes.agentPolicyId,
          }).catch(async (error) => {
            // Left saved, a retry would see no change and never schedule the move.
            await repo.editPrivateLocation(locationId, {
              label,
              tags,
              agentPolicyId: existingLocation.attributes.agentPolicyId,
            });
            throw error;
          });
        }
      }

      return toClientContract({
        ...existingLocation,
        attributes: {
          ...existingLocation.attributes,
          ...(newLocation ? newLocation.attributes : {}),
        },
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return response.notFound({
          body: {
            message: `Private location with id ${locationId} does not exist.`,
          },
        });
      }
      throw error;
    }
  },
});
