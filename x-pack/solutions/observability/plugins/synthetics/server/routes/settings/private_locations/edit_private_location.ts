/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { toClientContract, updatePrivateLocationMonitors } from './helpers';
import { PrivateLocation } from '../../../../common/runtime_types';
import { parseArrayFilters } from '../../common';

const EditPrivateLocationSchema = schema.object({
  label: schema.maybe(
    schema.string({
      minLength: 1,
    })
  ),
  tags: schema.maybe(schema.arrayOf(schema.string())),
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

  return isLabelChanged || areTagsChanged;
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
    const { response, request, savedObjectsClient, server } = routeContext;
    const { locationId } = request.params;
    const { label: newLocationLabel, tags: newTags } = request.body;

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
        // This privileges check is done only when changing the label, because changing the label will update also the monitors in that location
        if (isPrivateLocationLabelChanged(existingLocation.attributes.label, newLocationLabel)) {
          const monitorsSpaces = monitorsInLocation.map(({ namespaces }) => namespaces![0]);

          const checkSavedObjectsPrivileges =
            server.security.authz.checkSavedObjectsPrivilegesWithRequest(request);

          const { hasAllRequested } = await checkSavedObjectsPrivileges(
            'saved_object:synthetics-monitor/bulk_update',
            monitorsSpaces
          );

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
        }

        newLocation = await repo.editPrivateLocation(locationId, {
          label: newLocationLabel || existingLocation.attributes.label,
          tags: newTags || existingLocation.attributes.tags,
        });

        if (isPrivateLocationLabelChanged(existingLocation.attributes.label, newLocationLabel)) {
          await updatePrivateLocationMonitors({
            locationId,
            newLocationLabel,
            allPrivateLocations: await getPrivateLocations(savedObjectsClient),
            routeContext,
            monitorsInLocation,
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
