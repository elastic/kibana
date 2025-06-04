/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../common/entity_analytics/privilege_monitoring/constants';

export const getPrivilegedMonitorUsersJoin = (
  namespace: string
) => `| RENAME @timestamp AS event_timestamp
  | LOOKUP JOIN ${getPrivilegedMonitorUsersIndex(namespace)} ON user.name
  | RENAME event_timestamp AS @timestamp
  | EVAL is_privileged = labels.monitoring.privileged_users == "monitored"
  | WHERE is_privileged == true`;
