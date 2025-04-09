/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SCOPE = ['securitySolution'];
export const TYPE = 'entity_analytics:monitoring:privileges:engine';
export const VERSION = '1.0.0';
export const TIMEOUT = '10m';
export const INTERVAL = '10m';

export const PRIVILEGE_MONITORING_ENGINE_STATUS = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

// Base constants
export const PRIVMON_BASE_PREFIX = 'privmon' as const;
export const PRIVILEGE_MONITORING_INTERNAL_INDICES_PATTERN = `.${PRIVMON_BASE_PREFIX}*` as const;
