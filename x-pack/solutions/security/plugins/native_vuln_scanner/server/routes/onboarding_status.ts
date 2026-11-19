/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  FLEET_AGENT_POLICIES_READ_PRIVILEGE,
  NATIVE_VULN_SCANNER_API_VERSION,
  ONBOARDING_STATUS_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { collectOnboardingStatus } from '../lib/onboarding';
import { fleetUnavailable, respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

export const registerOnboardingStatusRoute = ({
  router,
  logger,
  getLicense,
  getServices,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ONBOARDING_STATUS_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [FLEET_AGENT_POLICIES_READ_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.statusSummary', {
        defaultMessage: 'Get the native vulnerability scanner onboarding status',
      }),
    })
    .addVersion(
      { version: NATIVE_VULN_SCANNER_API_VERSION, validate: false },
      withLicense(
        getLicense,
        async (context, request, response) => {
          try {
            const { fleet, workflows, es, packRepository } = await getServices();
            if (!fleet) return fleetUnavailable(response);
            const core = await context.core;
            const status = await collectOnboardingStatus({
              request,
              soClient: core.savedObjects.client,
              esInternal: es,
              packRepository,
              agentPolicyService: fleet.agentPolicyService,
              agentClient: fleet.agentService.asScoped(request),
              workflows,
            });
            return response.ok({ body: status });
          } catch (error) {
            return respondWithError(error, response, logger);
          }
        },
        (response) => response.ok({ body: { license: 'insufficient' } })
      )
    );
};
