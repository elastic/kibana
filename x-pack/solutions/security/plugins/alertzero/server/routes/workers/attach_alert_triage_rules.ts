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
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE,
  API_VERSIONS,
  AttachAlertTriageRulesRequestBody,
  AttachAlertTriageRulesRequestParams,
  INTERNAL_API_ACCESS,
  SYSTEM_SECURITY_WORKER_IDS,
  SYSTEM_SECURITY_WORKER_IDS_WITH_RULE_ATTACHMENT,
} from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';

const isOneOf = (ids: readonly string[], id: string) => ids.includes(id);

/**
 * Attaches a Worker to rules, only while the Worker is enabled in the space. Only a Worker that runs
 * through a per-rule action accepts rules (today, Alert Triage); any other Worker is a 400.
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
      path: ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
      summary: 'Attach rules to a Worker',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(AttachAlertTriageRulesRequestParams),
            body: buildRouteValidationWithZod(AttachAlertTriageRulesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { workerId } = request.params;
        if (!isOneOf(SYSTEM_SECURITY_WORKER_IDS, workerId)) {
          return response.notFound({
            body: {
              message: i18n.translate('xpack.alertzero.attachRulesWorkerNotFoundErrorMessage', {
                defaultMessage: 'Worker "{workerId}" not found',
                values: { workerId },
              }),
            },
          });
        }
        if (!isOneOf(SYSTEM_SECURITY_WORKER_IDS_WITH_RULE_ATTACHMENT, workerId)) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.alertzero.attachRulesWorkerUnsupportedErrorMessage', {
                defaultMessage: 'Worker "{workerId}" does not attach to detection rules',
                values: { workerId },
              }),
            },
          });
        }

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
