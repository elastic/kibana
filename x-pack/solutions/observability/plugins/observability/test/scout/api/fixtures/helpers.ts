/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestAuthFixture } from '@kbn/scout-oblt';

/**
 * Headers shared by every alerting/connector request these API specs make:
 * the xsrf token plus the internal-origin marker the alerting routes require.
 */
export const KIBANA_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/** Minimal shape of the `api/alerting/rule` create/update response we assert on. */
export interface RuleResponse {
  id: string;
  params: { noDataBehavior?: string };
}

/**
 * Resolve admin-scoped request headers. These suites verify rule execution and
 * parameter persistence (not RBAC), so the FTR superuser maps to an admin key.
 */
export const getAdminHeaders = async (
  requestAuth: RequestAuthFixture
): Promise<Record<string, string>> => {
  const { apiKeyHeader } = await requestAuth.getApiKey('admin');
  return { ...KIBANA_HEADERS, ...apiKeyHeader };
};
