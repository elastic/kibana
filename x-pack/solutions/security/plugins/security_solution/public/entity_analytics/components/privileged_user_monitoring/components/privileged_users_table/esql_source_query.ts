/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privilege_monitoring/utils';
import { getPrivilegedMonitorUsersJoin } from '../../queries/helpers';

export const getPrivilegedUsersQuery = (namespace: string) => {
  return `FROM ${getPrivilegedMonitorUsersIndex(namespace)}
  ${getPrivilegedMonitorUsersJoin(namespace)}
  | STATS
      user.is_privileged = TOP(user.is_privileged, 1, "desc"),
      labels.sources = TOP(labels.sources, 1, "desc"),
      eaLabels = TOP(entity_analytics_monitoring.labels.value, 10, "desc")
      BY user.name
  `;
};
