/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static index names: may be more obvious and easier to manage.
export const PRIVMON_BASE_INDEX_NAME = '.entity_analytics.monitoring';
export const ML_ANOMALIES_INDEX = '.ml-anomalies-shared*';

// CSV Upload
export const PRIVMON_USERS_CSV_MAX_SIZE_BYTES = 1024 * 1024; // 1MB
export const PRIVMON_USERS_CSV_SIZE_TOLERANCE_BYTES = 1024 * 50; // ~= 50kb
export const PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE =
  PRIVMON_USERS_CSV_MAX_SIZE_BYTES + PRIVMON_USERS_CSV_SIZE_TOLERANCE_BYTES;

const MONITORING_URL = `/api/entity_analytics/monitoring` as const;
const PAD_URL = `/api/entity_analytics/privileged_user_monitoring/pad` as const;

// Monitoring users URLs
export const MONITORING_USERS_URL = `${MONITORING_URL}/users` as const;
export const MONITORING_USERS_CSV_UPLOAD_URL = `${MONITORING_USERS_URL}/_csv` as const;
export const MONITORING_USERS_LIST_URL = `${MONITORING_USERS_URL}/list` as const;

// Monitoring entity source URLs
export const MONITORING_ENTITY_SOURCE_URL = `${MONITORING_URL}/entity_source` as const;
export const MONITORING_ENTITY_LIST_SOURCES_URL = `${MONITORING_ENTITY_SOURCE_URL}/list` as const;
export const getPrivmonMonitoringSourceByIdUrl = (id: string) =>
  `${MONITORING_ENTITY_SOURCE_URL}/${id}` as const;

// Privilege Monitoring URLs
const PRIVMON_URL = `${MONITORING_URL}/privileges` as const;
export const PRIVMON_PRIVILEGE_CHECK_API = `${PRIVMON_URL}/privileges`;
export const PRIVMON_INDICES_URL = `${PRIVMON_URL}/indices` as const;
export const PRIVMON_HEALTH_URL = `${PRIVMON_URL}/health` as const;

// Monitoring Engine URLs
const MONITORING_ENGINE_URL = `${MONITORING_URL}/engine` as const;
export const MONITORING_ENGINE_INIT_URL = `${MONITORING_ENGINE_URL}/init` as const;
export const MONITORING_ENGINE_SCHEDULE_NOW_URL = `${MONITORING_ENGINE_URL}/schedule_now` as const;
export const MONITORING_ENGINE_DELETE_URL = `${MONITORING_ENGINE_URL}/delete` as const;
export const MONITORING_ENGINE_DISABLE_URL = `${MONITORING_ENGINE_URL}/disable` as const;

// Privileged Access Detection (PAD) URLs
export const PAD_INSTALL_URL = `${PAD_URL}/install` as const;
export const PAD_STATUS_URL = `${PAD_URL}/status` as const;
