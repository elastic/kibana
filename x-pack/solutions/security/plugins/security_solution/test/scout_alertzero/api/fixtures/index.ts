/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout-security';
import { createApi } from './kbn';
import type { AlertZeroApi } from './kbn';

export { apiTest, tags } from '@kbn/scout-security';
export * as testData from './constants';
export {
  ALERTZERO_READ_ONLY_ROLE,
  HUNT_ALL_ROUTES,
  HUNT_BEHAVIOR_URL,
  HUNT_FOR_THREAT_URL,
  HUNT_READ_ROUTES,
  HUNT_WORKER_URL,
  HUNT_WRITE_ROUTES,
  SECURITY_READ_ONLY_ROLE,
  TI_HEADERS,
} from './constants';
export {
  cleanupThreatReportsByIds,
  enableAlertZeroInSpace,
  readAlertZeroEnabledInSpace,
  readSupplyStatus,
  runCleanupSteps,
  seedSharedReportWithEvidence,
  setAlertZeroEnabledInSpace,
  setHuntEnabled,
  setSupplyWorkflowEnabled,
  setupHuntPrerequisites,
  spaceUrl,
  withAlertZeroEnabledInSpace,
  withHuntHeaders,
  type HuntPrerequisites,
  type SupplyStatusBody,
} from './helpers';
export * from './kbn';
export * from './alertzero';
export * from './endpoint_analysis';
export { type SupplyWorkflowKey } from './supply_workflow_ids';

/** Authenticates once per worker as the admin user and exposes the cookie-bearing API helper. */
export const getAdminApi = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth
): Promise<AlertZeroApi> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  return createApi(apiClient, cookieHeader);
};
