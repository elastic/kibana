/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ML_ANOMALIES_INDEX,
  RISK_SCORE_INDEX_PATTERN,
  privilegedMonitorBaseIndexName,
} from '../constants';
import { getAlertsIndex } from '../utils';

export const getPrivilegedMonitorUsersIndex = (namespace: string) =>
  `${privilegedMonitorBaseIndexName}.users-${namespace}`;

// At the moment, this only includes the privileges required for reading dashboards.
export const getPrivilegeUserMonitoringRequiredEsIndexPrivileges = (namespace: string) => ({
  [getPrivilegedMonitorUsersIndex(namespace)]: ['read'],
  [RISK_SCORE_INDEX_PATTERN]: ['read'],
  [getAlertsIndex(namespace)]: ['read'],
  [ML_ANOMALIES_INDEX]: ['read'],
});
