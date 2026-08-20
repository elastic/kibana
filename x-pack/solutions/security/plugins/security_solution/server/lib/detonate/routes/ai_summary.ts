/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { API_VERSIONS, APP_ID } from '../../../../common/constants';
import type { DetonateAiSummaryResponse } from '../../../../common/detonate/api';
import { DetonateAiSummaryRequestBody } from '../../../../common/detonate/api';
import { DETONATE_AI_SUMMARY_PATH } from '../../../../common/detonate';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildDetonationContext } from '../detonation_context';
import { DETONATION_SUMMARY_PROMPT } from '../prompts';

/**
 * Returns the anonymized context and system prompt for a detonation summary. The model call itself
 * happens in the browser through the inference plugin, matching the entity summary pattern.
 */
export const detonateAiSummaryRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: DETONATE_AI_SUMMARY_PATH,
      security: {
        authz: { requiredPrivileges: [APP_ID] },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(DetonateAiSummaryRequestBody) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<DetonateAiSummaryResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { taskId, anonymizationFields } = request.body;
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const result = await buildDetonationContext({
            esClient,
            taskId,
            anonymizationFields,
          });

          if (result === null) {
            return siemResponse.error({
              statusCode: 404,
              body: `Detonation ${taskId} was not found`,
            });
          }

          return response.ok({
            body: {
              context: result.context,
              replacements: result.replacements,
              prompt: DETONATION_SUMMARY_PROMPT,
            },
          });
        } catch (e) {
          logger.error(`Failed to build the Detonate summary context: ${e.message}`);
          const error = transformError(e);

          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
