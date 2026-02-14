/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
  ATTACK_DISCOVERY_INTERNAL_PROMOTE,
  PostAttackDiscoveryPromoteRequestBody,
  PostAttackDiscoveryPromoteResponse,
} from '@kbn/elastic-assistant-common';
import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { buildResponse } from '../../../lib/build_response';
import { performChecks } from '../../helpers';

export const postAttackDiscoveryPromoteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_INTERNAL_PROMOTE,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostAttackDiscoveryPromoteRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(PostAttackDiscoveryPromoteResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostAttackDiscoveryPromoteResponse>> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const { attack_ids: attackIds } = request.body;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          // Resolve plugins
          const { elasticAssistant } = await context.resolve(['elasticAssistant']);

          const { rulesClient } = elasticAssistant;

          // Execute Ad-Hoc Rule
          const result = await rulesClient.executeAdHocRule({
            ruleTypeId: ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID,
            ruleParams: {
              attackIds,
            },
            ruleConsumer: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
          });

          return response.ok({
            body: {
              success: true,
              execution_uuid: result.id,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
