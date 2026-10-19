/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS } from '@kbn/scout-security';

/**
 * Threat intel routes are all `access: 'internal'` at version 1, so every
 * request needs the internal-origin header plus `elastic-api-version: 1`.
 * `kbn-xsrf` is additionally required for the mutating routes.
 */
export const TI_HEADERS = {
  ...INTERNAL_API_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};
