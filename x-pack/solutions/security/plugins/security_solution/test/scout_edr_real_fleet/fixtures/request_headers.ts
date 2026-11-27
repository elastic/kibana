/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';

/** Headers for public API requests sent with `apiClient` and an API key from `requestAuth`. */
export const buildRequestHeaders = (
  apiKeyHeader: Readonly<Record<string, string>>
): Record<string, string> => ({
  ...apiKeyHeader,
  ...PUBLIC_API_HEADERS,
  'kbn-xsrf': 'scout-edr-real-fleet',
  'Content-Type': 'application/json',
});
