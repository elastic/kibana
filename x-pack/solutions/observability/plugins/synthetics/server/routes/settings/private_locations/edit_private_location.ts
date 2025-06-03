/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
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
  label: schema.string({
    minLength: 1,
  }),
});

const EditPrivateLocationQuery = schema.object({
  locationId: schema.string(),
});

export type EditPrivateLocationAttributes = Pick<
  PrivateLocationAttributes,
  keyof TypeOf<typeof EditPrivateLocationSchema>
>;

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
    const { response, request, savedObjectsClient, spaceId } = routeContext;
    const { locationId } = request.params;
    const newLocationLabel = request.body.label;

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

      const monitorsSpaces = monitorsInLocation.map(({ attributes: { namespace } }) => namespace);

      // TODO: this should just check if the user has the right auth to modify the monitors of all the different monitorsSpaces spaces
      if (
        monitorsSpaces.length &&
        ((monitorsSpaces.length === 1 && monitorsSpaces[0] !== spaceId) ||
          monitorsSpaces.length > 1)
      ) {
        return response.conflict({
          body: {
            message: i18n.translate('xpack.synthetics.editPrivateLocation.monitorsInOtherSpaces', {
              defaultMessage:
                'There are monitors deployed to the same private location in other spaces and they cannot be updated',
            }),
          },
        });
      }

      const newLocation = await repo.editPrivateLocation(locationId, {
        label: newLocationLabel,
      });
      const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

      await updatePrivateLocationMonitors({
        locationId,
        newLocationLabel,
        allPrivateLocations,
        routeContext,
        monitorsInLocation,
      });

      return toClientContract({
        ...existingLocation,
        attributes: { ...existingLocation.attributes, ...newLocation.attributes },
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
