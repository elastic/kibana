/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { z } from '@kbn/zod';
import { routeId } from '../../zod_query';
import { PRIVATE_LOCATION_WRITE_API } from '../../../feature';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  PrivateLocationHealthStatusValue,
  type MonitorFields,
} from '../../../../common/runtime_types';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { normalizeSecrets } from '../../../synthetics_service/utils';
import { parseArrayFilters } from '../../common';

const DECRYPT_CHUNK_SIZE = 500;

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
  requiredPrivileges: [PRIVATE_LOCATION_WRITE_API],
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

    // Decrypt only the affected monitors, in chunks to keep the filter small.
    const decryptedMonitors = [];
    for (const configIds of chunk([...missingConfigIds], DECRYPT_CHUNK_SIZE)) {
      decryptedMonitors.push(
        ...(await monitorConfigRepository.findDecryptedMonitors({
          spaceId,
          filter: parseArrayFilters({ configIds }).filtersStr,
        }))
      );
    }

    // A monitor that failed to decrypt has stripped secrets; recreating its policy would
    // deploy it without credentials and hide it from later resets.
    const failed: ResetPrivateLocationResponse['failed'] = [];
    const monitors: Array<{ id: string; monitor: MonitorFields }> = [];
    for (const decrypted of decryptedMonitors) {
      if (decrypted.error) {
        failed.push({ id: decrypted.id, error: decrypted.error.message });
      } else {
        monitors.push({
          id: decrypted.id,
          monitor: normalizeSecrets(decrypted).attributes as MonitorFields,
        });
      }
    }

    if (monitors.length === 0) {
      return { created: 0, failed };
    }

    const result = await syntheticsMonitorClient.addPrivateLocationPackagePolicies({
      monitors,
      locationId,
      allPrivateLocations,
      spaceId,
    });

    return {
      created: result.created.length,
      failed: [
        ...failed,
        ...result.failed.map(({ packagePolicy, error }) => ({
          id: String(packagePolicy.id ?? ''),
          error: error?.message ?? 'Unknown error',
        })),
      ],
    };
  },
});
