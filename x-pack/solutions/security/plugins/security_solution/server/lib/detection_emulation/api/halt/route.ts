/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { DETECTION_ENGINE_EMULATION_HALT_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import type { EmulationConcurrencyGate } from '../../execution/concurrency_gate';

const I18N_PREFIX = 'xpack.securitySolution.detectionEmulation.haltRoute' as const;

const MESSAGES = {
  authRequired: i18n.translate(`${I18N_PREFIX}.authRequired`, {
    defaultMessage: 'Authentication is required to halt emulation reservations.',
  }),
  insufficientPrivileges: i18n.translate(`${I18N_PREFIX}.insufficientPrivileges`, {
    defaultMessage:
      'Insufficient privileges: halting emulation reservations requires the [canWriteExecuteOperations] Endpoint privilege.',
  }),
  internalError: i18n.translate(`${I18N_PREFIX}.internalError`, {
    defaultMessage: 'Failed to halt emulation reservations.',
  }),
  gateUnavailable: i18n.translate(`${I18N_PREFIX}.gateUnavailable`, {
    defaultMessage:
      'The concurrency gate is not wired into this Kibana process. The halt route requires the shared guardrail bundle constructed in plugin setup.',
  }),
} as const;

/**
 * Body shape: optional `spaceId`. When omitted the handler resolves
 * the caller's current space. The body is tolerated but only ever
 * read for `spaceId` — POST without a body is the canonical "halt my
 * current space" call.
 */
const haltBodySchema = schema.maybe(
  schema.object({
    /**
     * Override the space to halt. When omitted defaults to the
     * caller's current space (the typical operator workflow). Reserved
     * for cluster-wide halt scripts that iterate over known spaces.
     */
    spaceId: schema.maybe(schema.string({ minLength: 1 })),
  })
);

/**
 * Operator-driven halt for in-flight detection-emulation reservations.
 *
 * Pairs with the runtime kill switch
 * (`xpack.securitySolution.detectionEmulation.realExecutionEnabled`):
 * the kill switch blocks NEW dispatches; this route releases the
 * concurrency-gate slots already in flight so the gate doesn't keep a
 * space wedged after the kill switch flips. The two together implement
 * a "stop everything" story without restarting Kibana.
 *
 * RBAC: same `canWriteExecuteOperations` Endpoint privilege the
 * `execute` / `runscript` commands require — operators with halt
 * authority should also have execute authority (otherwise they could
 * cancel validations whose existence they shouldn't see).
 *
 * Closes register row #10 residual / R-N3 — see
 * `detection-emulation-production-risk-analysis.html`.
 */
export const haltEmulationRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  {
    concurrencyGate: concurrencyGateOverride,
  }: {
    concurrencyGate?: EmulationConcurrencyGate;
  } = {}
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_EMULATION_HALT_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        tags: ['oas-tag:emulation'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: haltBodySchema,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          if (!concurrencyGateOverride) {
            // Production wiring always supplies the gate via the shared
            // guardrail bundle. Reaching this branch means the route was
            // registered in a test or partial-DI context that didn't
            // forward the gate — fail loud rather than silently report
            // "0 cancelled" and miss real in-flight reservations.
            logger.error(
              `[detection-emulation-halt] Halt route invoked without a concurrencyGate override — guardrail wiring is incomplete.`
            );
            return siemResponse.error({
              statusCode: 500,
              body: MESSAGES.gateUnavailable,
            });
          }

          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const currentSpaceId = securitySolution.getSpaceId();

          // Authenticated caller required — same N5 reasoning as run_command.
          const currentUser = coreContext.security?.authc.getCurrentUser();
          if (!currentUser?.username) {
            logger.warn(
              `[detection-emulation-halt] Halt request blocked: no authenticated user (space=${currentSpaceId})`
            );
            return siemResponse.error({ statusCode: 401, body: MESSAGES.authRequired });
          }

          // RBAC — the halt is a destructive operation against in-flight
          // emulation reservations; require the same canWriteExecuteOperations
          // privilege the execute/runscript commands require so operators
          // with halt authority have at least equal authority over what
          // they're cancelling.
          const endpointAuthz = await securitySolution.getEndpointAuthz();
          if (!endpointAuthz.canWriteExecuteOperations) {
            logger.warn(
              `[detection-emulation-halt] Halt request blocked: user [${currentUser.username}] lacks canWriteExecuteOperations (space=${currentSpaceId})`
            );
            return siemResponse.error({
              statusCode: 403,
              body: MESSAGES.insufficientPrivileges,
            });
          }

          const targetSpaceId = request.body?.spaceId ?? currentSpaceId;
          const result = concurrencyGateOverride.cancelAllInflight(targetSpaceId);

          logger.info(
            `[detection-emulation-halt] User [${currentUser.username}] halted ${result.cancelled} in-flight emulation reservation(s) in space [${targetSpaceId}]`
          );

          return response.ok({
            body: {
              cancelled: result.cancelled,
              spaceId: targetSpaceId,
            },
          });
        } catch (err) {
          const transformed = transformError(err);
          logger.error(`[detection-emulation-halt] Halt route failed: ${transformed.message}`, {
            tags: ['detection-emulation-halt'],
          } as Record<string, unknown>);
          return siemResponse.error({
            statusCode: transformed.statusCode,
            body: transformed.message || MESSAGES.internalError,
          });
        }
      }
    );
};
