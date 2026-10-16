/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { createApi } from './kbn';
import type { AlertZeroApi } from './kbn';

export { tags } from '@kbn/scout-security';
export * as testData from './constants';
export { cleanupThreatReportsByIds, SECURITY_READ_ONLY_ROLE } from './helpers';
export * from './kbn';
export * from './alertzero';
export * from './endpoint_analysis';

/** Authenticates once per worker as the admin user and exposes the cookie-bearing API helper. */
export const getAdminApi = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth
): Promise<AlertZeroApi> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  return createApi(apiClient, cookieHeader);
};

export { apiTest };
