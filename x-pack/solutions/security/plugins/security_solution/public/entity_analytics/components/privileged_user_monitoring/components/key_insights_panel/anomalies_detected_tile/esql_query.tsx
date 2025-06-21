/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../helpers';
import { createTimeFilter, type TimeRange } from '../common/time_filter';

export const getAnomaliesDetectedEsqlQuery = (namespace: string, timeRange?: TimeRange) => {
  const timeFilter = createTimeFilter(timeRange);

  return `FROM .ml-anomalies-shared
    ${timeFilter}
    | WHERE record_score IS NOT NULL AND record_score > 0
    | WHERE user.name IS NOT NULL
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | STATS COUNT(*)`;
};
