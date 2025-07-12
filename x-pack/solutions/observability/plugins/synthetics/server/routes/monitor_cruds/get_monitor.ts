/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SyntheticsRestApiRouteFactory } from '../types';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import { ConfigKey, EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS, SYNTHETICS_FEATURE_ID } from '../../../common/constants';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';

export const getSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR,
  validate: {},
  validation: {
    request: {
      params: schema.object({
        monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
      }),
      query: schema.object({
        internal: schema.maybe(
          schema.boolean({
            defaultValue: false,
          })
        ),
      }),
    },
  },
  handler: async ({
    request,
    response,
    server: { coreStart },
    spaceId,
    monitorConfigRepository,
  }): Promise<any> => {
    const { monitorId } = request.params;
    try {
      const { internal } = request.query;

      const canSave =
        (
          await coreStart?.capabilities.resolveCapabilities(request, {
            capabilityPath: `${SYNTHETICS_FEATURE_ID}.*`,
          })
        )[SYNTHETICS_FEATURE_ID].save ?? false;

      if (Boolean(canSave)) {
        // only user with write permissions can decrypt the monitor
        const monitor = await monitorConfigRepository.getDecrypted(monitorId, spaceId);
        return {
          ...mapSavedObjectToMonitor({ monitor: monitor.normalizedMonitor, internal }),
          spaceId,
          spaces: monitor.decryptedMonitor.namespaces,
        };
      } else {
        const monObj = await monitorConfigRepository.get(monitorId);
        return {
          ...mapSavedObjectToMonitor({
            monitor: monObj,
            internal,
          }),
          spaceId,
          spaces: monObj.namespaces,
        };
      }
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});

export function getOverviewConfigsPerLocation(
  attributes: EncryptedSyntheticsMonitorAttributes,
  queriedLocations?: string | string[]
) {
  const id = attributes[ConfigKey.MONITOR_QUERY_ID];
  const configId = attributes[ConfigKey.CONFIG_ID];

  /* for each location, add a config item */
  const locations = attributes[ConfigKey.LOCATIONS];
  const queriedLocationsArray =
    queriedLocations && !Array.isArray(queriedLocations) ? [queriedLocations] : queriedLocations;

  /* exclude nob matching locations if location filter is present */
  const filteredLocations = queriedLocationsArray?.length
    ? locations.filter(
        (loc) =>
          (loc.label && queriedLocationsArray.includes(loc.label)) ||
          queriedLocationsArray.includes(loc.id)
      )
    : locations;

  return filteredLocations.map((location) => ({
    id,
    configId,
    location,
    name: attributes[ConfigKey.NAME],
    schedule: attributes[ConfigKey.SCHEDULE].number,
    tags: attributes[ConfigKey.TAGS],
    isEnabled: attributes[ConfigKey.ENABLED],
    type: attributes[ConfigKey.MONITOR_TYPE],
    projectId: attributes[ConfigKey.PROJECT_ID],
    isStatusAlertEnabled: isStatusEnabled(attributes[ConfigKey.ALERT_CONFIG]),
  }));
}
