/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Required on internal routes when `server.restrictInternalApis` is true. */
export const elasticInternalOriginHeader = {
  'x-elastic-internal-origin': 'kibana',
} as const;

/** Public Kibana HTTP API (`elastic-api-version: 2023-10-31`). */
export const publicApiHeaders = {
  ...elasticInternalOriginHeader,
  'elastic-api-version': '2023-10-31',
} as const;

/** Internal Kibana HTTP API (`elastic-api-version: 1`). */
export const internalApiHeaders = {
  ...elasticInternalOriginHeader,
  'elastic-api-version': '1',
} as const;
