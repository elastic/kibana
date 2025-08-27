/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegeMonitrUsersJoinNoTimestamp } from '../../../queries/helpers';

export const getAlertsTriggeredEsqlCount = (namespace: string, alertsIndexName: string | null) => {
  if (!alertsIndexName) return '';
  return `FROM ${alertsIndexName}
    ${getPrivilegeMonitrUsersJoinNoTimestamp(namespace)}
    | STATS count = COUNT(*)`;
};
