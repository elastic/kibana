/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { i18n } from '@kbn/i18n';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import {
  ALERTZERO_ALERT_TRIAGE_ATTACH_RULES_URL,
  ALERTZERO_ENABLED_SETTING_ID,
  API_VERSIONS,
  AttachAlertTriageRulesRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';

/**
 * Attaches the Alert Triage Worker to rules, only while the Worker is enabled in the space.
 *
 * Authorized on rule write access, not on AlertZero's own privilege: it runs as whoever created the
 * rules (see the managed workflow that calls it), and that user can edit the rules but may not hold
 * an AlertZero privilege. It therefore does not use `withAlertZeroEnabled`, which answers 404 or 403
 * when AlertZero is off or unlicensed; those are expected here and reported as typed outcomes so a
 * caller can tell "nothing to do" from a real failure.
 */
export const registerAttachAlertTriageRulesRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkersService,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ALERTZERO_ALERT_TRIAGE_ATTACH_RULES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
      summary: 'Attach rules to the Alert Triage Worker',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AttachAlertTriageRulesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { uiSettings } = await context.core;
          const { subscription, hasRequiredDependencies } = await context.alertzero;
          const isUsable =
            (await uiSettings.client.get<boolean>(ALERTZERO_ENABLED_SETTING_ID)) === true &&
            subscription === 'available' &&
            hasRequiredDependencies;
          if (!isUsable) {
            return response.ok({ body: { outcome: 'worker_unavailable' } });
          }

          const body = await getWorkersService().attachRulesToAlertTriageWorker(
            request.body,
            getSpaceId(request),
            request
          );
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to attach rules to the Alert Triage Worker: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.alertzero.alertTriageAttachRulesErrorMessage', {
                defaultMessage: 'Failed to attach rules to the Alert Triage Worker',
              }),
            },
          });
        }
      }
    );
};
