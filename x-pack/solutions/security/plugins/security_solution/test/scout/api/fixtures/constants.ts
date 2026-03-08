/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import {
  ENTITY_STORE_ROUTES as BASE_ENTITY_STORE_ROUTES,
  FF_ENABLE_ENTITY_STORE_V2,
} from '@kbn/entity-store/common';

export { FF_ENABLE_ENTITY_STORE_V2 };

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2',
};

const stripLeadingSlash = (path: string) => (path.startsWith('/') ? path.slice(1) : path);

export const ENTITY_STORE_ROUTES = {
  INSTALL: stripLeadingSlash(BASE_ENTITY_STORE_ROUTES.INSTALL),
  UNINSTALL: stripLeadingSlash(BASE_ENTITY_STORE_ROUTES.UNINSTALL),
  FORCE_LOG_EXTRACTION: (entityType: string) =>
    `internal/security/entity_store/${entityType}/force_log_extraction`,
};

export const MAINTAINER_ROUTES = {
  RUN: 'internal/security_solution/poc/run_maintainer',
} as const;

export const ENTITY_STORE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

export const LATEST_INDEX = '.entities.v2.latest.security_default';
