/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  FLEET_AGENT_POLICIES_ALL_PRIVILEGE,
  NATIVE_VULN_SCANNER_API_VERSION,
  ONBOARDING_SCHEDULE_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

/** Enables or disables the daily scan. The workflow is installed once, disabled, in the default space. */
export const registerOnboardingScheduleRoute = ({
  router,
  logger,
  getLicense,
  getServices,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ONBOARDING_SCHEDULE_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [FLEET_AGENT_POLICIES_ALL_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.scheduleSummary', {
        defaultMessage: 'Enable or disable the scheduled native vulnerability scan',
      }),
    })
    .addVersion(
      {
        version: NATIVE_VULN_SCANNER_API_VERSION,
        validate: { request: { body: schema.object({ enabled: schema.boolean() }) } },
      },
      withLicense(getLicense, async (_context, request, response) => {
        try {
          const { workflows } = await getServices();
          const { enabled } = request.body as { enabled: boolean };
          await workflows.updateWorkflow(
            NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
            { enabled },
            DEFAULT_SPACE_ID,
            request
          );
          return response.ok({ body: { enabled } });
        } catch (error) {
          return respondWithError(error, response, logger);
        }
      })
    );
};
