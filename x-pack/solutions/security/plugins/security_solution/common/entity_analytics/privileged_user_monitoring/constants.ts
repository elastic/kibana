/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PRIVMON_PUBLIC_URL = `/api/entity_analytics/monitoring` as const;
export const PRIVMON_ENGINE_PUBLIC_URL = `${PRIVMON_PUBLIC_URL}/engine` as const;
export const PRIVMON_USER_PUBLIC_CSV_UPLOAD_URL = `${PRIVMON_PUBLIC_URL}/users/_csv` as const;
export const PRIVMON_PUBLIC_INIT = `${PRIVMON_PUBLIC_URL}/engine/init` as const;
export const getPrivmonMonitoringSourceByIdUrl = (id: string) =>
  `${PRIVMON_PUBLIC_URL}/entity_source/${id}` as const;

export const PRIVMON_USERS_CSV_MAX_SIZE_BYTES = 1024 * 1024; // 1MB
export const PRIVMON_USERS_CSV_SIZE_TOLERANCE_BYTES = 1024 * 50; // ~= 50kb
export const PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE =
  PRIVMON_USERS_CSV_MAX_SIZE_BYTES + PRIVMON_USERS_CSV_SIZE_TOLERANCE_BYTES;
