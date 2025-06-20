/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { intersection } from 'lodash';
import { periodToMs } from '../../routes/overview_status/utils';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  SourceType,
} from '../../../common/runtime_types';

export interface MonitorData {
  scheduleInMs: number;
  locations: string[];
  type: string;
}

export const processMonitors = (
  allMonitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>,
  queryLocations?: string[] | string
) => {
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */
  const enabledMonitorQueryIds: string[] = [];
  const disabledMonitorQueryIds: string[] = [];
  let disabledCount = 0;
  let disabledMonitorsCount = 0;
  let projectMonitorsCount = 0;
  const allIds: string[] = [];
  let listOfLocationsSet = new Set<string>();
  const monitorQueryIdToConfigIdMap: Record<string, string> = {};
  const monitorsData: Record<string, MonitorData> = {};

  for (const monitor of allMonitors) {
    const attrs = monitor.attributes;

    allIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);

    projectMonitorsCount += attrs?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT ? 1 : 0;

    monitorQueryIdToConfigIdMap[attrs[ConfigKey.MONITOR_QUERY_ID]] = attrs[ConfigKey.CONFIG_ID];

    const monitorLocIds = attrs[ConfigKey.LOCATIONS].map((location) => location.id);

    if (attrs[ConfigKey.ENABLED] === false) {
      const queriedLocations = Array.isArray(queryLocations) ? queryLocations : [queryLocations];
      const intersectingLocations = intersection(
        monitorLocIds,
        queryLocations ? queriedLocations : monitorLocIds
      );
      disabledCount += intersectingLocations.length;
      disabledMonitorsCount += 1;
      disabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
    } else {
      enabledMonitorQueryIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);

      monitorsData[attrs[ConfigKey.MONITOR_QUERY_ID]] = {
        scheduleInMs: periodToMs(attrs[ConfigKey.SCHEDULE]),
        locations: queryLocations ? intersection(monitorLocIds, queryLocations) : monitorLocIds,
        type: attrs[ConfigKey.MONITOR_TYPE],
      };

      listOfLocationsSet = new Set([...listOfLocationsSet, ...monitorLocIds]);
    }
  }

  return {
    maxPeriod: Math.max(...Object.values(monitorsData).map(({ scheduleInMs }) => scheduleInMs)),
    allIds,
    enabledMonitorQueryIds,
    disabledMonitorQueryIds,
    disabledCount,
    disabledMonitorsCount,
    projectMonitorsCount,
    monitorLocationIds: [...listOfLocationsSet],
    monitorQueryIdToConfigIdMap,
    monitorsData,
  };
};
