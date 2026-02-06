/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { pick } from 'lodash';
import pRetry from 'p-retry';
import type { SyntheticsServerSetup } from '../types';
import type {
  ManifestLocation,
  PublicLocation,
  PublicLocations,
  ThrottlingOptions,
} from '../../common/runtime_types';
import { BandwidthLimitKey, LocationStatus } from '../../common/runtime_types';

const RETRY_COUNT = 3;
const MIN_TIMEOUT_MS = 1000; // 1 second initial delay

export const getDevLocation = (devUrl: string): PublicLocation[] => [
  {
    id: 'dev',
    label: 'Dev Service',
    geo: { lat: 0, lon: 0 },
    url: devUrl,
    isServiceManaged: true,
    status: LocationStatus.EXPERIMENTAL,
    isInvalid: false,
  },
  {
    id: 'dev2',
    label: 'Dev Service 2',
    geo: { lat: 0, lon: 0 },
    url: devUrl,
    isServiceManaged: true,
    status: LocationStatus.EXPERIMENTAL,
    isInvalid: false,
  },
];

export async function getServiceLocations(server: SyntheticsServerSetup) {
  let locations: PublicLocations = [];

  if (server.config.service?.devUrl) {
    locations = getDevLocation(server.config.service.devUrl);
  }
  const manifestUrl = server.config.service?.manifestUrl;

  if (!manifestUrl || manifestUrl === 'mockDevUrl') {
    return { locations };
  }

  try {
    const { data } = await pRetry(
      async () => {
        return axios.get<{
          throttling: ThrottlingOptions;
          locations: Record<string, ManifestLocation>;
        }>(server.config.service!.manifestUrl!);
      },
      {
        retries: RETRY_COUNT,
        minTimeout: MIN_TIMEOUT_MS,
        factor: 2, // Exponential backoff: 1s, 2s, 4s
        onFailedAttempt: (error) => {
          server.logger.debug(
            `Attempt ${error.attemptNumber} to fetch Synthetics locations failed. ${error.retriesLeft} retries remaining.`
          );
        },
      }
    );

    const availableLocations = Object.entries(data.locations);

    availableLocations.forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
        isServiceManaged: true,
        status: location.status,
        isInvalid: false,
      });
    });

    const throttling = pick(
      data.throttling,
      BandwidthLimitKey.DOWNLOAD,
      BandwidthLimitKey.UPLOAD
    ) as ThrottlingOptions;

    return { throttling, locations };
  } catch (error) {
    server.logger.error(`Error getting available Synthetics locations, Error: ${error.message}`, {
      error,
    });
    return { locations: [] };
  }
}
