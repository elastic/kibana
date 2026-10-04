/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { routeId } from '../../zod_query';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  PrivateLocationHealthStatusValue,
  type MonitorFields,
} from '../../../../common/runtime_types';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { normalizeSecrets } from '../../../synthetics_service/utils';
import { parseArrayFilters } from '../../common';

export interface ResetPrivateLocationResponse {
  created: number;
  failed: Array<{ id: string; error: string }>;
}

/**
 * Recreates the missing package policies of a private location. Only that location's
 * missing policies are created, so only its agent policy gets a new revision.
 */
export const resetPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  ResetPrivateLocationResponse
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATION_RESET,
  validate: {
    params: z.strictObject({ id: routeId }),
  },
  handler: async (routeContext) => {
    const {
      request,
      response,
      savedObjectsClient,
      spaceId,
      monitorIntegrationHealthApi,
      monitorConfigRepository,
      syntheticsMonitorClient,
    } = routeContext;
    const { id: locationId } = request.params;

    const allPrivateLocations = await getPrivateLocations(savedObjectsClient);
    if (!allPrivateLocations.some(({ id }) => id === locationId)) {
      return response.notFound({
        body: { message: `Private location with id ${locationId} does not exist.` },
      });
    }

    const { monitors: health } = await monitorIntegrationHealthApi.getHealthForLocations([
      locationId,
    ]);
    const missingConfigIds = new Set(
      health
        .filter(({ privateLocations }) =>
          privateLocations.some(
            (loc) =>
              loc.locationId === locationId &&
              loc.status === PrivateLocationHealthStatusValue.MissingPackagePolicy
          )
        )
        .map(({ configId }) => configId)
    );
    if (missingConfigIds.size === 0) {
      return { created: 0, failed: [] };
    }

    const decryptedMonitors = await monitorConfigRepository.findDecryptedMonitors({
      spaceId,
      filter: parseArrayFilters({ locations: [locationId] }).filtersStr,
    });
    const monitors = decryptedMonitors
      .filter(({ id }) => missingConfigIds.has(id))
      .map((monitor) => ({
        id: monitor.id,
        monitor: normalizeSecrets(monitor).attributes as MonitorFields,
      }));

    const { created, failed } = await syntheticsMonitorClient.addPrivateLocationPackagePolicies({
      monitors,
      locationId,
      allPrivateLocations,
      spaceId,
    });

    return {
      created: created.length,
      failed: failed.map(({ packagePolicy, error }) => ({
        id: String(packagePolicy.id ?? ''),
        error: error?.message ?? 'Unknown error',
      })),
    };
  },
});
