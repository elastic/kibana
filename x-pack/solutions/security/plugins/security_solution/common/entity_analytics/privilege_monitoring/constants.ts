/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static index names: may be more obvious and easier to manage.
export const privilegedMonitorBaseIndexName = '.entity_analytics.monitoring';
export const ML_ANOMALIES_INDEX = '.ml-anomalies-shared';

// Default index for privileged monitoring users.
export const defaultMonitoringUsersIndex = (namespace: string) =>
  `entity_analytics.privileged_monitoring.${namespace}`;

export const PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API =
  '/api/entity_analytics/monitoring/privileges/privileges';
