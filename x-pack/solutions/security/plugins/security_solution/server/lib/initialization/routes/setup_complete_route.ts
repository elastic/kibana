/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, RequestHandlerContext } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  SECURITY_SETUP_COMPLETE_TRIGGER_ID,
  setupCompleteEventSchema,
} from '../../../../common/triggers/setup_complete_trigger';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';

export const SETUP_COMPLETE_URL = '/api/security_solution/setup_complete' as const;

export const setupCompleteRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: SETUP_COMPLETE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(setupCompleteEventSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const workflows = await (
            context as RequestHandlerContext & { workflows?: Promise<unknown> }
          ).workflows;

          if (workflows && typeof workflows === 'object') {
            const client = (
              workflows as { getWorkflowsClient: () => { emitEvent: Function } }
            ).getWorkflowsClient();
            await client.emitEvent(SECURITY_SETUP_COMPLETE_TRIGGER_ID, {
              completed_cards: request.body.completed_cards,
            });
            logger.debug(
              `Emitted ${SECURITY_SETUP_COMPLETE_TRIGGER_ID} event with cards: ${request.body.completed_cards.join(
                ', '
              )}`
            );
          } else {
            logger.debug(
              `Workflows plugin not available, skipping ${SECURITY_SETUP_COMPLETE_TRIGGER_ID} event emission`
            );
          }

          return response.ok({ body: { ok: true } });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
