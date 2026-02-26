/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2',
};

/**
 * Entity Store API routes
 */
export const ENTITY_STORE_ROUTES = {
  INSTALL: 'internal/security/entity_store/install',
  START: 'internal/security/entity_store/start',
  STOP: 'internal/security/entity_store/stop',
  UNINSTALL: 'internal/security/entity_store/uninstall',
  FORCE_LOG_EXTRACTION: (entityType: string) =>
    `internal/security/entity_store/${entityType}/force_log_extraction`,
  CRUD_UPSERT: (entityType: string) => `internal/security/entity_store/entities/${entityType}`,
  CRUD_UPSERT_BULK: 'internal/security/entity_store/entities/bulk',
  CRUD_DELETE: 'internal/security/entity_store/entities/',
} as const;

export const ENTITY_STORE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

export const UPDATES_INDEX = '.entities.v2.updates.security_default';
export const LATEST_INDEX = '.entities.v2.latest.security_default';
