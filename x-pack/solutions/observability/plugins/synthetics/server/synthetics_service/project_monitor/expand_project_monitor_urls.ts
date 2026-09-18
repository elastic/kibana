/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import type { ProjectMonitor } from '../../../common/runtime_types';
import { MonitorTypeEnum } from '../../../common/runtime_types';

const URL_MONITOR_ID_SEPARATOR = '--url--';

export const getUrlMonitorId = (parentId: string, url: string, occurrence = 0) => {
  const hash = createHash('sha256').update(`${url}\u0000${occurrence}`).digest('hex');
  return `${parentId}${URL_MONITOR_ID_SEPARATOR}${hash}`;
};

export const isUrlMonitorForParent = (monitorId: string, parentId: string) =>
  monitorId.startsWith(`${parentId}${URL_MONITOR_ID_SEPARATOR}`);

/**
 * Project monitor URL arrays represent distinct monitor configurations. Keep
 * the single-URL form unchanged for backwards compatibility, but give each
 * URL in a multi-URL HTTP monitor a stable identity of its own.
 */
export const expandProjectMonitorUrls = (monitors: ProjectMonitor[]): ProjectMonitor[] =>
  monitors.flatMap((monitor) => {
    if (
      monitor.type !== MonitorTypeEnum.HTTP ||
      !Array.isArray(monitor.urls) ||
      monitor.urls.length <= 1
    ) {
      return monitor;
    }

    const occurrences = new Map<string, number>();

    return monitor.urls.map((url) => {
      const occurrence = occurrences.get(url) ?? 0;
      occurrences.set(url, occurrence + 1);

      return {
        ...monitor,
        id: getUrlMonitorId(monitor.id, url, occurrence),
        urls: url,
      };
    });
  });
