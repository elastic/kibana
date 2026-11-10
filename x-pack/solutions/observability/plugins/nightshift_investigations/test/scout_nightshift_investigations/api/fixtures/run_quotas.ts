/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, SamlAuth, ScoutLogger } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

const RUN_QUOTAS_PATH = 'internal/significant_events/run_quotas';

/**
 * Turns the deployment-wide daily investigation limits off for the run.
 *
 * The limits (`manual_investigation`, `total_investigation`) are counted per deployment per day,
 * and this suite's specs share one stack: together they start more investigations than the
 * defaults allow, so whichever spec runs last is refused with a `429` — which spec that is
 * depends on how the lane shards. The limits have their own coverage in `significant_events`;
 * nothing here asserts on them.
 *
 * Plain `fetch` with the admin's session cookie, for the reason `createAdminRequester` gives:
 * `kbnClient` authenticates as the native superuser, which UIAM rejects on Serverless.
 */
export const disableInvestigationRunLimits = async ({
  kbnUrl,
  samlAuth,
  log,
}: {
  kbnUrl: KibanaUrl;
  samlAuth: SamlAuth;
  log: ScoutLogger;
}): Promise<void> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const response = await fetch(kbnUrl.get(`/${RUN_QUOTAS_PATH}`), {
    method: 'PUT',
    headers: { ...COMMON_HEADERS, ...cookieHeader, 'content-type': 'application/json' },
    body: JSON.stringify({ investigationLimitsEnabled: false }),
  });
  if (!response.ok) {
    throw new Error(`[PUT ${RUN_QUOTAS_PATH}] ${response.status}: ${await response.text()}`.trim());
  }
  log.info('Daily investigation run limits disabled for this test run');
};
