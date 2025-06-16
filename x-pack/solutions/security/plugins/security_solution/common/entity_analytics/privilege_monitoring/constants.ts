/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static index names: may be more obvious and easier to manage.
export const privilegedMonitorBaseIndexName = '.entity_analytics.monitoring';

// Used in Phase 0.
export const getPrivilegedMonitorUsersIndex = (namespace: string) =>
  `${privilegedMonitorBaseIndexName}.users-${namespace}`;
// Not required in phase 0.
export const getPrivilegedMonitorGroupsIndex = (namespace: string) =>
  `${privilegedMonitorBaseIndexName}.groups-${namespace}`;
// Default index for privileged monitoring users. Not required.
export const defaultMonitoringUsersIndex = 'entity_analytics.privileged_monitoring';
