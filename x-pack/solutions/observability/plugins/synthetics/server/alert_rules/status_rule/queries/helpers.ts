/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SavedObjectsFindResult } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { MonitorData } from '../../../saved_objects/synthetics_monitor/process_monitors';
import {
  AlertStatusConfigs,
  AlertPendingStatusConfigs,
  MissingPingMonitorInfo,
} from '../../../../common/runtime_types/alert_rules/common';
import { ConfigKey, EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';

export interface ConfigStats {
  up: number;
  down: number;
  pending: number;
}

export const getMissingPingMonitorInfo = ({
  monitors,
  configId,
  locationId,
}: {
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>;
  configId: string;
  locationId: string;
}): (MissingPingMonitorInfo & { createdAt?: string }) | undefined => {
  const monitor = monitors.find(
    // for project monitors, we can match by id or by monitor query id
    (m) => m.id === configId || m.attributes[ConfigKey.MONITOR_QUERY_ID] === configId
  );
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
    createdAt: monitor.created_at,
  };
};

const isMonitorReadyForData = ({
  createdAt,
  monitorType,
}: {
  createdAt?: string;
  monitorType: string;
}) => {
  const waitMinutesBeforePending = monitorType === 'browser' ? 5 : 1;
  return (
    !createdAt ||
    (createdAt &&
      moment(createdAt).isBefore(moment().subtract(waitMinutesBeforePending, 'minutes')))
  );
};

export const getPendingConfigs = ({
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
  monitorsData: Record<string, MonitorData>;
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
        const res = getMissingPingMonitorInfo({
          configId: monitorQueryId,
          locationId,
          monitors,
        });
        if (res) {
          const { createdAt, ...monitorInfo } = res;
          if (
            isMonitorReadyForData({ monitorType: monitorsData[monitorQueryId].type, createdAt })
          ) {
            pendingConfigs[configWithLocationId] = {
              status: 'pending',
              configId: monitorQueryId,
              monitorQueryId,
              locationId,
              monitorInfo,
            };
          }
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

export const getConfigStats = ({
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

export const calculateIsValidPing = ({
  previousRunEndTimeISO,
  scheduleInMs,
  previousRunDurationUs = 0,
  minimumTotalBufferMs = 60 * 1000, // 60 seconds
}: {
  previousRunEndTimeISO: string;
  scheduleInMs: number;
  previousRunDurationUs?: number;
  minimumTotalBufferMs?: number;
}) => {
  const msSincePreviousRunEnd = new Date().getTime() - new Date(previousRunEndTimeISO).getTime();
  const stalenessThresholdMs =
    scheduleInMs + Math.max(minimumTotalBufferMs, previousRunDurationUs / 1000);

  // Example: if a monitor has a schedule of 5m the last valid ping can be at (5+1)m
  // If it's greater than that it means the monitor is pending
  return msSincePreviousRunEnd < stalenessThresholdMs;
};
