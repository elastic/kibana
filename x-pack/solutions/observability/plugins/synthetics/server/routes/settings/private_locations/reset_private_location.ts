/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { resetPrivateLocationMonitors } from './reset_private_location_monitors';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { parseArrayFilters } from '../../common';

const EditPrivateLocationQuery = schema.object({
  locationId: schema.string(),
});

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
};

export const resetPrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}/reset',
  validate: {},
  validation: {
    request: {
      params: EditPrivateLocationQuery,
    },
  },
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
  handler: async (routeContext) => {
    const { response, request, savedObjectsClient, monitorConfigRepository } = routeContext;
    const { locationId } = request.params;

    try {
      const { filtersStr } = parseArrayFilters({
        locations: [locationId],
      });

      const [allPrivateLocations, monitorsInLocation] = await Promise.all([
        getPrivateLocations(savedObjectsClient),
        monitorConfigRepository.findDecryptedMonitors({
          spaceId: ALL_SPACES_ID,
          filter: filtersStr,
        }),
      ]);

      await checkPrivileges({
        routeContext,
        monitorsSpaces: monitorsInLocation.map(({ namespaces }) => namespaces![0]),
      });

      await resetPrivateLocationMonitors({
        allPrivateLocations,
        routeContext,
        monitorsInLocation,
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
