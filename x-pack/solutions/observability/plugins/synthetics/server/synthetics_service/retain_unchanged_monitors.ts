/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type {
  MonitorFields,
  ServiceLocation,
  ServiceLocations,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { ConfigKey } from '../../common/runtime_types';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import { getUnchangedMonitorsFilter } from './incremental_sync';
import type {
  RetainedMonitor,
  ServiceData,
  SyntheticsServiceHttpClient,
} from './synthetics_service_http_client';

// A retained monitor is just an id and a type, so far more fit in one request than a full one.
const RETAIN_PAGE_SIZE = 1000;
const FETCH_MONITOR_CONCURRENCY = 10;

type RetainableMonitorAttributes = Pick<
  MonitorFields,
  ConfigKey.MONITOR_QUERY_ID | ConfigKey.MONITOR_TYPE | ConfigKey.ENABLED | ConfigKey.LOCATIONS
>;

/** What is known about a saved monitor without reading its configuration. */
export interface RetainableMonitor extends RetainedMonitor {
  savedObjectId: string;
  savedObjectType: string;
  namespace?: string;
}

/**
 * Keeps the monitors that were not edited since `changedSince` alive at the service locations
 * that run them, without reading their configuration.
 *
 * @returns the monitors the service could not retain, which have to be sent in full
 */
export const retainUnchangedMonitors = async ({
  soClient,
  changedSince,
  output,
  license,
  httpClient,
  locations,
  logger,
}: {
  soClient: ISavedObjectsRepository;
  changedSince: string;
  output: ServiceData['output'];
  license: ServiceData['license'];
  httpClient: SyntheticsServiceHttpClient;
  locations: ServiceLocations;
  logger: Logger;
}): Promise<RetainableMonitor[]> => {
  const notRetained = new Map<string, RetainableMonitor>();
  const candidatesByLocation = new Map<string, RetainableMonitor[]>();
  let retainedCount = 0;

  const retainBatch = async (location: ServiceLocation, candidates: RetainableMonitor[]) => {
    let failedIds = new Set(candidates.map(({ id }) => id));
    if (httpClient.supportsRetain(location.id)) {
      try {
        failedIds = new Set(
          await httpClient.retainMonitors({
            monitors: candidates,
            output,
            license,
            locationId: location.id,
          })
        );
      } catch (error) {
        logger.error(`Failed to retain monitors at location ${location.id}`, { error });
      }
    }

    retainedCount += candidates.length - failedIds.size;
    candidates.forEach((candidate) => {
      if (failedIds.has(candidate.id)) {
        notRetained.set(candidate.savedObjectId, candidate);
      }
    });
  };

  const retainAllLocations = async (perBatch = 0) => {
    await pMap(locations, async (location) => {
      const candidates = candidatesByLocation.get(location.id) ?? [];
      while (candidates.length > perBatch) {
        await retainBatch(location, candidates.splice(0, RETAIN_PAGE_SIZE));
      }
    });
  };

  const finder = soClient.createPointInTimeFinder<RetainableMonitorAttributes>({
    type: syntheticsMonitorSOTypes,
    perPage: RETAIN_PAGE_SIZE,
    namespaces: [ALL_SPACES_ID],
    filter: getUnchangedMonitorsFilter(changedSince),
    fields: [
      ConfigKey.MONITOR_QUERY_ID,
      ConfigKey.MONITOR_TYPE,
      ConfigKey.ENABLED,
      ConfigKey.LOCATIONS,
    ],
  });

  for await (const { saved_objects: monitors } of finder.find()) {
    for (const monitor of monitors) {
      const { id, type, enabled, locations: monitorLocations } = monitor.attributes;
      const serviceLocations = (monitorLocations ?? []).filter(
        ({ isServiceManaged }) => isServiceManaged
      );

      // The service only holds enabled monitors at the locations it runs.
      if (enabled === false || serviceLocations.length === 0) {
        continue;
      }

      const candidate: RetainableMonitor = {
        id,
        type,
        savedObjectId: monitor.id,
        savedObjectType: monitor.type,
        namespace: monitor.namespaces?.[0],
      };

      // Without both there is nothing to look the monitor up by at the service.
      if (!id || !type) {
        notRetained.set(monitor.id, candidate);
        continue;
      }

      serviceLocations.forEach(({ id: locationId }) => {
        candidatesByLocation.set(locationId, [
          ...(candidatesByLocation.get(locationId) ?? []),
          candidate,
        ]);
      });
    }

    await retainAllLocations(RETAIN_PAGE_SIZE);
  }
  await retainAllLocations();
  finder.close().catch(() => {});

  logger.debug(
    `${retainedCount} unchanged monitors were retained at the synthetics service, ${notRetained.size} need a full sync.`
  );

  return Array.from(notRetained.values());
};

/**
 * Reads the given monitors with their secrets. A monitor deleted since it was listed is skipped,
 * as there is nothing left to send. Any other failure, such as one to decrypt it, is counted in
 * `unreadable` so the caller does not treat the monitor as synced.
 */
export const readDecryptedMonitors = async ({
  encryptedClient,
  monitors,
  logger,
}: {
  encryptedClient: EncryptedSavedObjectsClient;
  monitors: RetainableMonitor[];
  logger: Logger;
}) => {
  let unreadable = 0;

  const decrypted = await pMap(
    monitors,
    async ({ savedObjectType, savedObjectId, namespace }) => {
      try {
        return await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
          savedObjectType,
          savedObjectId,
          { namespace }
        );
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          logger.debug(`Monitor ${savedObjectId} was deleted before it could be synced`);
        } else {
          unreadable++;
          logger.warn(`Could not read monitor ${savedObjectId} to sync it: ${error.message}`);
        }
      }
    },
    { concurrency: FETCH_MONITOR_CONCURRENCY }
  );

  return {
    monitors: decrypted.filter((monitor): monitor is NonNullable<typeof monitor> => !!monitor),
    unreadable,
  };
};
