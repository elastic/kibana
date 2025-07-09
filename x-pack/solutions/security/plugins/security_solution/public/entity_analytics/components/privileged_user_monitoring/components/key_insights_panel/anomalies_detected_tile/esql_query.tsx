/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALIES_INDEX } from '../../../../../../../common/constants';
import { getPrivilegedMonitorUsersJoin } from '../../../queries/helpers';

export const getAnomaliesDetectedEsqlQuery = (namespace: string) => {
  return `FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL AND record_score > 0
    | WHERE user.name IS NOT NULL
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | STATS COUNT(*)`;
};
