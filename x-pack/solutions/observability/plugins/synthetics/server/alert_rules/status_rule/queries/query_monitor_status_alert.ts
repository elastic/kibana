/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { times } from 'lodash';
import { intersection } from 'lodash';
import moment from 'moment';
import { SavedObjectsFindResult } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import {
  AlertStatusConfigs,
  AlertStatusMetaData,
  AlertPendingStatusConfigs,
  MissingPingMonitorInfo,
} from '../../../../common/runtime_types/alert_rules/common';
import {
  EncryptedSyntheticsMonitorAttributes,
  OverviewPing,
} from '../../../../common/runtime_types';
import { SyntheticsEsClient } from '../../../lib';
import { getSearchPingsParams } from './get_search_ping_params';

const DEFAULT_MAX_ES_BUCKET_SIZE = 10000;

interface ConfigStats {
  up: number;
  down: number;
  pending: number;
}
export interface AlertStatusResponse {
  upConfigs: AlertStatusConfigs;
  downConfigs: AlertStatusConfigs;
  pendingConfigs: AlertPendingStatusConfigs;
  enabledMonitorQueryIds: string[];
  configStats: Record<string, ConfigStats>;
}

const getMissingPingMonitorInfo = ({
  monitors,
  configId,
  locationId,
}: {
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>;
  configId: string;
  locationId: string;
}): MissingPingMonitorInfo | undefined => {
  const monitor = monitors.find((m) => m.id === configId);
  if (!monitor) {
    // This should never happen
    return;
  }

  // For some reason 'urls' is not considered a valid attribute in the monitor attributes, there's probably a problem with the EncryptedSyntheticsMonitorAttributes type
  const fullUrl =
    'urls' in monitor.attributes && typeof monitor.attributes.urls === 'string'
      ? monitor.attributes.urls
      : '';

  return {
    monitor: {
      name: monitor.attributes.name,
      id: configId,
      type: monitor.attributes.type,
    },
    observer: {
      geo: {
        name: monitor.attributes.locations.find((l) => l.id === locationId)?.label || '',
      },
    },
    labels: monitor.attributes.labels,
    tags: monitor.attributes.tags,
    url: { full: fullUrl },
  };
};

const getPendingConfigs = async ({
  monitorQueryIds,
  monitorLocationIds,
  upConfigs,
  downConfigs,
  monitorsData,
  monitors,
  logger,
}: {
  monitorQueryIds: string[];
  monitorLocationIds: string[];
  upConfigs: AlertStatusConfigs;
  downConfigs: AlertStatusConfigs;
  monitorsData: Record<string, { scheduleInMs: number; locations: string[] }>;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>;
  logger: Logger;
}) => {
  // Check if a config is missing, if it is it means that the monitor is pending
  const pendingConfigs: AlertPendingStatusConfigs = {};

  for (const monitorQueryId of monitorQueryIds) {
    for (const locationId of monitorLocationIds) {
      const configWithLocationId = `${monitorQueryId}-${locationId}`;

      const isConfigMissing =
        !upConfigs[configWithLocationId] &&
        !downConfigs[configWithLocationId] &&
        monitorsData[monitorQueryId].locations.includes(locationId);

      if (isConfigMissing) {
        const monitorInfo = getMissingPingMonitorInfo({
          configId: monitorQueryId,
          locationId,
          monitors,
        });
        if (monitorInfo) {
          pendingConfigs[configWithLocationId] = {
            status: 'pending',
            configId: monitorQueryId,
            monitorQueryId,
            locationId,
            monitorInfo,
          };
        } else {
          logger.error(
            `Config ${configWithLocationId} not added to pending configs because the monitor info is missing`
          );
        }
      }
    }
  }

  return pendingConfigs;
};

const getConfigStats = ({
  monitorQueryIds,
  upConfigs,
  downConfigs,
  pendingConfigs,
}: {
  monitorQueryIds: string[];
  upConfigs: AlertStatusConfigs;
  downConfigs: AlertStatusConfigs;
  pendingConfigs: AlertPendingStatusConfigs;
}) => {
  // Pre-organize configs by monitorId for faster lookup
  const configsByMonitor = new Map<string, ConfigStats>();

  // Initialize all monitors with zero counts
  for (const monitorId of monitorQueryIds) {
    configsByMonitor.set(monitorId, { up: 0, down: 0, pending: 0 });
  }

  // Count up configs
  for (const configKey of Object.keys(upConfigs)) {
    const monitorId = upConfigs[configKey].monitorQueryId;
    const stats = configsByMonitor.get(monitorId);
    if (stats) stats.up++;
  }

  // Count down configs
  for (const configKey of Object.keys(downConfigs)) {
    const monitorId = downConfigs[configKey].monitorQueryId;
    const stats = configsByMonitor.get(monitorId);
    if (stats) stats.down++;
  }

  // Count pending configs
  for (const configKey of Object.keys(pendingConfigs)) {
    const monitorId = pendingConfigs[configKey].monitorQueryId;
    const stats = configsByMonitor.get(monitorId);
    if (stats) stats.pending++;
  }

  // Convert Map to the expected Record structure
  return Object.fromEntries(configsByMonitor.entries());
};

export async function queryMonitorStatusAlert({
  esClient,
  monitorLocationIds,
  range,
  monitorQueryIds,
  numberOfChecks,
  includeRetests = true,
  monitorsData,
  monitors,
  logger,
}: {
  esClient: SyntheticsEsClient;
  monitorLocationIds: string[];
  range: { from: string; to: string };
  monitorQueryIds: string[];
  numberOfChecks: number;
  includeRetests?: boolean;
  monitorsData: Record<string, { scheduleInMs: number; locations: string[] }>;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>;
  logger: Logger;
}): Promise<AlertStatusResponse> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / monitorLocationIds.length || 1);
  const pageCount = Math.ceil(monitorQueryIds.length / idSize);
  const upConfigs: AlertStatusConfigs = {};
  const downConfigs: AlertStatusConfigs = {};

  for (let i = monitorQueryIds.length - 1; i >= 0; i--) {
    const monitorQueryId = monitorQueryIds[i];
    if (monitorsData[monitorQueryId] === undefined) {
      logger.error(
        `Monitor ${monitorQueryId} not found in monitorsData, removing from query. This should never happen.`
      );
      monitorQueryIds.splice(i, 1);
    }
  }

  await pMap(
    times(pageCount),
    async (i) => {
      const idsToQuery = (monitorQueryIds as string[]).slice(i * idSize, i * idSize + idSize);

      const params = getSearchPingsParams({
        idSize,
        idsToQuery,
        monitorLocationIds,
        range,
        numberOfChecks,
        includeRetests,
      });

      const { body: result } = await esClient.search<OverviewPing, typeof params>(
        params,
        'Monitors status rule query'
      );

      result.aggregations?.id.buckets.forEach(({ location, key: queryId }) => {
        const locationSummaries = location.buckets.map(
          ({ key: locationId, totalChecks, downChecks }) => {
            return { locationId, totalChecks, downChecks };
          }
        );

        // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
        // in monitorLocationsMap but not in listOfLocations
        const monLocations = monitorsData[queryId].locations;
        const monQueriedLocations = intersection(monLocations, monitorLocationIds);
        monQueriedLocations?.forEach((monLocationId) => {
          const locationSummary = locationSummaries.find(
            (summary) => summary.locationId === monLocationId
          );

          if (locationSummary) {
            const { totalChecks, downChecks } = locationSummary;
            const latestPing = totalChecks.hits.hits[0]._source;
            const downCount = downChecks.doc_count;
            const isLatestPingUp = (latestPing.summary?.up ?? 0) > 0;
            const configId = latestPing.config_id;
            const monitorQueryId = latestPing.monitor.id;

            const msSinceLastPing =
              new Date().getTime() - new Date(latestPing['@timestamp']).getTime();
            const msBeforeIsPending =
              monitorsData[monitorQueryId].scheduleInMs +
              moment.duration(60, 'seconds').asMilliseconds();

            // Example: if a monitor has a schedule of 5m the last valid ping can be at (5+1)m
            // If it's greater than that it means the monitor is pending
            const isValidPing = msBeforeIsPending - msSinceLastPing > 0;

            const meta: AlertStatusMetaData = {
              ping: latestPing,
              configId,
              monitorQueryId,
              locationId: monLocationId,
              timestamp: latestPing['@timestamp'],
              checks: {
                downWithinXChecks: totalChecks.hits.hits.reduce(
                  (acc, curr) => acc + ((curr._source.summary.down ?? 0) > 0 ? 1 : 0),
                  0
                ),
                down: downCount,
              },
              status: 'up',
            };

            if (isValidPing && downCount > 0) {
              downConfigs[`${configId}-${monLocationId}`] = {
                ...meta,
                status: 'down',
              };
            }
            if (isValidPing && isLatestPingUp) {
              upConfigs[`${configId}-${monLocationId}`] = {
                ...meta,
                status: 'up',
              };
            }
          }
        });
      });
    },
    { concurrency: 5 }
  );

  const pendingConfigs = await getPendingConfigs({
    monitorQueryIds,
    monitorLocationIds,
    upConfigs,
    downConfigs,
    monitorsData,
    monitors,
    logger,
  });

  const configStats = getConfigStats({ downConfigs, upConfigs, pendingConfigs, monitorQueryIds });

  return {
    upConfigs,
    downConfigs,
    pendingConfigs,
    enabledMonitorQueryIds: monitorQueryIds,
    configStats,
  };
}
