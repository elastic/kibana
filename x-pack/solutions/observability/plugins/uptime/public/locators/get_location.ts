/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UptimeOverviewLocatorInfraParams,
  UptimeOverviewLocatorParams,
} from '@kbn/deeplinks-observability';
import { OVERVIEW_ROUTE } from '../../common/constants';

const formatSearchKey = (key: string, value: string) => `${key}: "${value}"`;

function isUptimeOverviewLocatorParams(
  args: UptimeOverviewLocatorInfraParams | UptimeOverviewLocatorParams
): args is UptimeOverviewLocatorParams {
  return (
    (args as UptimeOverviewLocatorParams).search !== undefined ||
    (args as UptimeOverviewLocatorParams).dateRangeEnd !== undefined ||
    (args as UptimeOverviewLocatorParams).dateRangeStart !== undefined
  );
}

export function getLocation(
  params: UptimeOverviewLocatorInfraParams | UptimeOverviewLocatorParams
) {
  let qs = '';

  if (isUptimeOverviewLocatorParams(params)) {
    qs = Object.entries(params)
      .map(([key, value]) => {
        if (value) {
          return `${key}=${value}`;
        }
      })
      .join('&');
  } else {
    const searchParams: string[] = [];
    if (params.host) searchParams.push(formatSearchKey('host.name', params.host));
    if (params.container) searchParams.push(formatSearchKey('container.id', params.container));
    if (params.pod) searchParams.push(formatSearchKey('kubernetes.pod.uid', params.pod));
    if (params.ip) {
      searchParams.push(formatSearchKey(`host.ip`, params.ip));
      searchParams.push(formatSearchKey(`monitor.ip`, params.ip));
    }
    if (searchParams.length > 0) {
      qs = `search=${searchParams.join(' OR ')}`;
    }
  }

  const path = `${OVERVIEW_ROUTE}${qs ? `?${qs}` : ''}`;

  return {
    app: 'uptime',
    path,
    state: {},
  };
}
