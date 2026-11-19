/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  FLEET_AGENT_POLICIES_ALL_PRIVILEGE,
  NATIVE_VULN_SCANNER_API_VERSION,
  ONBOARDING_PLAN_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { buildOnboardingPlan } from '../lib/onboarding';
import { policyIdsBodySchema } from './policy_ids_schema';
import { fleetUnavailable, respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

/** Dry run: what `runtime_pin` and the browser-side pack apply would change. Writes nothing. */
export const registerOnboardingPlanRoute = ({
  router,
  logger,
  getLicense,
  getServices,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ONBOARDING_PLAN_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [FLEET_AGENT_POLICIES_ALL_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.planSummary', {
        defaultMessage: 'Plan the native vulnerability scanner onboarding without applying it',
      }),
    })
    .addVersion(
      {
        version: NATIVE_VULN_SCANNER_API_VERSION,
        validate: { request: { body: policyIdsBodySchema } },
      },
      withLicense(getLicense, async (context, request, response) => {
        try {
          const { fleet } = await getServices();
          if (!fleet) return fleetUnavailable(response);
          const core = await context.core;
          const plan = await buildOnboardingPlan(
            fleet.agentPolicyService,
            core.savedObjects.client,
            (request.body as { policyIds: string[] }).policyIds
          );
          return response.ok({ body: plan });
        } catch (error) {
          return respondWithError(error, response, logger);
        }
      })
    );
};
