/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPLv1) for more details.
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_ONBOARDING_ENABLE_URL,
} from '@kbn/alertzero-common';
import { ALERTZERO_ENABLED_SETTING } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

/**
 * POST /internal/alertzero/onboarding/enable
 *
 * Transaction: flip the per-space `alertzero:enabled` advanced setting to true,
 * install watch workflows into the space, ensure the agent. Setting is written
 * only after the install transaction succeeds, so a failed enable leaves the
 * space exactly as it was.
 */
export const registerEnableOnboardingRoute = ({
  router,
  logger,
  getSpaceId,
  getOnboardingService,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ALERTZERO_ONBOARDING_ENABLE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Enable AlertZero for the current space',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(z.object({}).strict()),
          },
        },
      },
      async (context, request, response) => {
        const spaceId = getSpaceId(request);
        try {
          const onboarding = getOnboardingService();
          const result = await onboarding.enable(spaceId);
          if (result.outcome === 'failed') {
            return response.customError({
              statusCode: 503,
              body: {
                message: i18n.translate('xpack.alertzero.onboarding.enableFailed', {
                  defaultMessage: 'AlertZero enablement failed: {error}',
                  values: { error: result.error ?? 'unknown error' },
                }),
              },
            });
          }
          // Source of truth flips last: install succeeded, now persist intent.
          const core = await context.core;
          await core.uiSettings.client.set(ALERTZERO_ENABLED_SETTING, true);
          logger.info(`alertzero:enabled set to true in space "${spaceId}"`);
          return response.ok({
            body: { outcome: result.outcome, spaceId, installedWorkerIds: result.installedWorkerIds },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`AlertZero onboarding enable route failed: ${message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.alertzero.onboarding.enableRouteError', {
                defaultMessage: 'AlertZero onboarding enable failed: {message}',
                values: { message },
              }),
            },
          });
        }
      }
    );
};

/**
 * DELETE /internal/alertzero/onboarding/enable
 *
 * Flip the setting to false and uninstall watch workflows from the space.
 * Conversations and history are never deleted.
 */
export const registerDisableOnboardingRoute = ({
  router,
  logger,
  getSpaceId,
  getOnboardingService,
}: RouteDependencies) => {
  router.versioned
    .delete({
      path: ALERTZERO_ONBOARDING_ENABLE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Disable AlertZero for the current space',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (context, request, response) => {
        const spaceId = getSpaceId(request);
        try {
          const onboarding = getOnboardingService();
          const core = await context.core;
          await core.uiSettings.client.set(ALERTZERO_ENABLED_SETTING, false);
          const result = await onboarding.disable(spaceId);
          if (result.outcome === 'failed') {
            logger.error(
              `AlertZero disabled in setting but worker removal failed in space "${spaceId}": ${result.error}`
            );
          }
          return response.ok({
            body: { outcome: 'disabled', spaceId, removedWorkerIds: result.installedWorkerIds },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`AlertZero onboarding disable route failed: ${message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.alertzero.onboarding.disableRouteError', {
                defaultMessage: 'AlertZero onboarding disable failed: {message}',
                values: { message },
              }),
            },
          });
        }
      }
    );
};
