/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { times } from 'lodash';
import { intersection } from 'lodash';
import { SavedObjectsFindResult } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { MonitorData } from '../../../saved_objects/synthetics_monitor/process_monitors';
import {
  AlertStatusConfigs,
  AlertStatusMetaData,
  AlertPendingStatusConfigs,
} from '../../../../common/runtime_types/alert_rules/common';
import {
  EncryptedSyntheticsMonitorAttributes,
  OverviewPing,
} from '../../../../common/runtime_types';
import { SyntheticsEsClient } from '../../../lib';
import { getSearchPingsParams } from './get_search_ping_params';
import { ConfigStats, calculateIsValidPing, getConfigStats, getPendingConfigs } from './helpers';

const DEFAULT_MAX_ES_BUCKET_SIZE = 10000;

export interface AlertStatusResponse {
  upConfigs: AlertStatusConfigs;
  downConfigs: AlertStatusConfigs;
  pendingConfigs: AlertPendingStatusConfigs;
  enabledMonitorQueryIds: string[];
  configStats: Record<string, ConfigStats>;
}

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
  monitorsData: Record<string, MonitorData>;
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

            const isValidPing = calculateIsValidPing({
              scheduleInMs: monitorsData[monitorQueryId].scheduleInMs,
              previousRunEndTimeISO: latestPing['@timestamp'],
              previousRunDurationUs: latestPing.monitor.duration?.us,
            });

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

  const pendingConfigs = getPendingConfigs({
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
