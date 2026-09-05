/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, updatePrivateLocationMonitors } from './helpers';
import { assertCanEnableAgentSharding } from './agent_sharding_license';
import type { PrivateLocation } from '../../../../common/runtime_types';
import { parseArrayFilters } from '../../common';
import { syntheticsMonitorSOTypes } from '../../../../common/types/saved_objects';

const EditPrivateLocationSchema = schema.object({
  label: schema.maybe(
    schema.string({
      minLength: 1,
    })
  ),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  isAgentSharding: schema.maybe(schema.boolean()),
});

const EditPrivateLocationQuery = schema.object({
  locationId: schema.string(),
});

export type EditPrivateLocationAttributes = Pick<
  PrivateLocationAttributes,
  keyof TypeOf<typeof EditPrivateLocationSchema>
>;

const isPrivateLocationLabelChanged = (oldLabel: string, newLabel?: string): newLabel is string => {
  return typeof newLabel === 'string' && oldLabel !== newLabel;
};

const isPrivateLocationShardingChanged = (existing?: boolean, next?: boolean): boolean =>
  typeof next === 'boolean' && next !== Boolean(existing);

const withIntendedLocationEdits = <
  T extends { id: string; label?: string; isAgentSharding?: boolean }
>(
  locations: T[],
  locationId: string,
  edits: { label?: string; isAgentSharding?: boolean }
): T[] =>
  locations.map((location) => {
    if (location.id !== locationId) {
      return location;
    }
    return {
      ...location,
      ...(edits.label !== undefined ? { label: edits.label } : {}),
      ...(typeof edits.isAgentSharding === 'boolean'
        ? { isAgentSharding: edits.isAgentSharding }
        : {}),
    };
  });

const isPrivateLocationChanged = ({
  privateLocation,
  newParams,
}: {
  privateLocation: SavedObject<PrivateLocationAttributes>;
  newParams: TypeOf<typeof EditPrivateLocationSchema>;
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
  const isShardingChanged = isPrivateLocationShardingChanged(
    privateLocation.attributes.isAgentSharding,
    newParams.isAgentSharding
  );

  return isLabelChanged || areTagsChanged || isShardingChanged;
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
  TypeOf<typeof EditPrivateLocationQuery>,
  any,
  TypeOf<typeof EditPrivateLocationSchema>
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}',
  validate: {},
  validation: {
    request: {
      body: EditPrivateLocationSchema,
      params: EditPrivateLocationQuery,
    },
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { response, request, savedObjectsClient, context } = routeContext;
    const { locationId } = request.params;
    const {
      label: newLocationLabel,
      tags: newTags,
      isAgentSharding: newIsAgentSharding,
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

      const licenseError = assertCanEnableAgentSharding(
        (await context.licensing).license,
        newIsAgentSharding,
        existingLocation.attributes.isAgentSharding
      );
      if (licenseError) {
        return response.forbidden({ body: { message: licenseError } });
      }

      let newLocation: Awaited<ReturnType<typeof repo.editPrivateLocation>> | undefined;

      if (
        isPrivateLocationChanged({ privateLocation: existingLocation, newParams: request.body })
      ) {
        const isLabelChanged = isPrivateLocationLabelChanged(
          existingLocation.attributes.label,
          newLocationLabel
        );
        const isShardingChanged = isPrivateLocationShardingChanged(
          existingLocation.attributes.isAgentSharding,
          newIsAgentSharding
        );
        const shouldSyncMonitors = isLabelChanged || isShardingChanged;

        // Rewrite monitors before persisting: generateNewPolicy reads the
        // in-memory location list (label and isAgentSharding), so overlay the
        // intended edits. A failed rewrite must not leave the SO flipped.
        if (shouldSyncMonitors && monitorsInLocation.length) {
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

        if (shouldSyncMonitors) {
          const storedLocations = await getPrivateLocations(savedObjectsClient);
          const allPrivateLocations = withIntendedLocationEdits(storedLocations, locationId, {
            ...(isLabelChanged ? { label: newLocationLabel } : {}),
            ...(isShardingChanged && typeof newIsAgentSharding === 'boolean'
              ? { isAgentSharding: newIsAgentSharding }
              : {}),
          });
          await updatePrivateLocationMonitors({
            locationId,
            newLocationLabel: newLocationLabel || existingLocation.attributes.label,
            allPrivateLocations,
            routeContext,
            monitorsInLocation,
          });
        }

        newLocation = await repo.editPrivateLocation(locationId, {
          label: newLocationLabel || existingLocation.attributes.label,
          tags: newTags || existingLocation.attributes.tags,
          ...(typeof newIsAgentSharding === 'boolean'
            ? { isAgentSharding: newIsAgentSharding }
            : {}),
        });
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
