/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCLUDE_ELASTIC_CLOUD_INDICES, INCLUDE_INDEX_PATTERN } from '../../../../common/constants';
export const SCOPE = ['securitySolution'];
export const TYPE = 'entity_analytics:monitoring:privileges:engine';
export const VERSION = '1.0.0';
export const TIMEOUT = '10m';
export const INTERVAL = '10m';

export const PRIVILEGE_MONITORING_ENGINE_STATUS = {
  // TODO Make the engine initialization async before uncommenting these lines
  // Also implement a status API for FE to poll
  // INSTALLING: 'installing',
  // STOPPED: 'stopped',
  STARTED: 'started',
  ERROR: 'error',
} as const;

// Base constants
export const PRIVMON_BASE_PREFIX = 'privmon' as const;
export const PRIVILEGE_MONITORING_INTERNAL_INDICES_PATTERN = `.${PRIVMON_BASE_PREFIX}*` as const;

// Indices that are exclude from the search
export const PRE_EXCLUDE_INDICES: string[] = [
  ...INCLUDE_INDEX_PATTERN.map((index) => `-${index}`),
  ...EXCLUDE_ELASTIC_CLOUD_INDICES,
];

// Indices that are excludes from the search result (This patterns can't be excluded from the search)
export const POST_EXCLUDE_INDICES = ['.']; // internal indices
