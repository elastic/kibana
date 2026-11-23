/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

/** Required on internal routes when `server.restrictInternalApis` is true. */
export const ELASTIC_INTERNAL_ORIGIN_HEADER = {
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
} as const;

/** Public Kibana HTTP API (`elastic-api-version: 2023-10-31`). */
export const PUBLIC_API_HEADERS = {
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
} as const;

/** Internal Kibana HTTP API (`elastic-api-version: 1`). */
export const INTERNAL_API_HEADERS = {
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;
