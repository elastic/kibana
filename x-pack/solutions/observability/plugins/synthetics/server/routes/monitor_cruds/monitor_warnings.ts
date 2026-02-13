/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ProjectMonitor, SyntheticsMonitor } from '../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../common/runtime_types';

interface MonitorWarning {
  monitorId: string;
  publicLocationIds: string[];
  message: string;
}

const buildBrowserTimeoutWarning = (monitorId: string, publicLocationIds: string[]): MonitorWarning => ({
  monitorId,
  message: i18n.translate(
    'xpack.synthetics.server.monitors.browserTimeoutNoPrivateLocationsWarning',
    {
      defaultMessage:
        'For browser monitors, timeout is only supported on private locations. Browser monitor {monitorId} specifies a timeout and is running on public locations: {publicLocationIds}. The timeout will have no effect on these locations.',
      values: { monitorId, publicLocationIds: publicLocationIds.join(', ') },
    }
  ),
  publicLocationIds,
});

export const getBrowserTimeoutWarningForMonitor = (
  monitor: SyntheticsMonitor,
  monitorId: string
): MonitorWarning | null => {
  if (monitor[ConfigKey.MONITOR_TYPE] !== MonitorTypeEnum.BROWSER) {
    return null;
  }
  if (!monitor[ConfigKey.TIMEOUT]) {
    return null;
  }
  const publicLocationIds = monitor.locations?.filter((location) => location.isServiceManaged).map((location) => location.id);
  if (publicLocationIds.length === 0) {
    return null;
  }
  return buildBrowserTimeoutWarning(monitorId, publicLocationIds);
};

export const getBrowserTimeoutWarningsForProjectMonitors = (
  monitors: ProjectMonitor[]
): MonitorWarning[] => {
  return monitors
    .reduce<MonitorWarning[]>((acc, monitor) => {

      if (monitor.type === MonitorTypeEnum.BROWSER &&
        Boolean(monitor.timeout) &&
        (monitor.locations ?? []).length > 0) {
        acc.push(buildBrowserTimeoutWarning(monitor.id, monitor.locations as string[]))
      }

      return acc;
    }, [])
};
