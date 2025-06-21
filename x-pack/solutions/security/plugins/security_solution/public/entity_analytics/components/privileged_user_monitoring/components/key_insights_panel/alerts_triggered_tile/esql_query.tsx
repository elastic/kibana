/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../helpers';
import { createTimeFilter, type TimeRange } from '../common/time_filter';

export const getAlertsTriggeredEsqlCount = (namespace: string, timeRange?: TimeRange) => {
  const timeFilter = createTimeFilter(timeRange);

  return `FROM .alerts-*
    ${timeFilter}
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | STATS COUNT(*)`;
};
