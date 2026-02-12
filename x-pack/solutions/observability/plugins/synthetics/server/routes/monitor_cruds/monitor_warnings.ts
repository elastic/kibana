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
  id: string;
  message: string;
}

const buildBrowserTimeoutWarning = (monitorId: string): MonitorWarning => ({
  id: monitorId,
  message: i18n.translate(
    'xpack.synthetics.server.monitors.browserTimeoutNoPrivateLocationsWarning',
    {
      defaultMessage:
        'Monitor {monitorId} specifies a timeout but has no private locations configured. The timeout will have no effect.',
      values: { monitorId },
    }
  ),
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
  const hasPrivateLocations = monitor.locations?.some((location) => !location.isServiceManaged);
  if (hasPrivateLocations) {
    return null;
  }
  return buildBrowserTimeoutWarning(monitorId);
};

export const getBrowserTimeoutWarningsForProjectMonitors = (
  monitors: ProjectMonitor[]
): MonitorWarning[] => {
  return monitors
    .filter(
      (monitor) =>
        monitor.type === MonitorTypeEnum.BROWSER &&
        Boolean(monitor.timeout) &&
        (monitor.privateLocations ?? []).length === 0
    )
    .map((monitor) => buildBrowserTimeoutWarning(monitor.id));
};
