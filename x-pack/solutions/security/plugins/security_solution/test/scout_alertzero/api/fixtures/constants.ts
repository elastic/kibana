/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER, INTERNAL_API_HEADERS } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

/**
 * Internal AlertZero routes are registered for `API_VERSIONS.internal.v1` only, so
 * requests must carry `elastic-api-version: 1` — the same header the plugin's own UI
 * sends (`useWorkersApi`). Without it the versioned router rejects the request.
 */
export const INTERNAL_COMMON_HEADERS = {
  ...COMMON_HEADERS,
  ...INTERNAL_API_HEADERS,
};
