/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, StartServicesAccessor, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { acknowledgeSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_AI_ASSISTED_CREATE_RULE_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { StartPlugins } from '../../../../plugin';
import { SuggestUserProfilesRequestQuery } from '../../../../../common/api/detection_engine/users';
import type { AIAssistedCreateRuleResponse } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
import { AIAssistedCreateRuleRequestBody } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { getRulesSchemaMock } from '../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
export const createAIAssistedRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_AI_ASSISTED_CREATE_RULE_URL,
      access: 'internal',
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
            body: buildRouteValidationWithZod(AIAssistedCreateRuleRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<AIAssistedCreateRuleResponse>> => {
        console.log('Creating AI-assisted rule');
        const { user_query: userQuery } = request.body;

        return response.ok({ body: { rule: getRulesSchemaMock() } });
        // const siemResponse = buildSiemResponse(response);
        // const [_, { security }] = await getStartServices();
        // const securitySolution = await context.securitySolution;
        // const spaceId = securitySolution.getSpaceId();

        // try {
        //   const users = await security.userProfiles.suggest({
        //     name: searchTerm,
        //     dataPath: 'avatar',
        //     requiredPrivileges: {
        //       spaceId,
        //       privileges: {
        //         kibana: [security.authz.actions.login],
        //       },
        //     },
        //   });

        //   return response.ok({ body: users });
        // } catch (err) {
        //   const error = transformError(err);
        //   return siemResponse.error({
        //     body: error.message,
        //     statusCode: error.statusCode,
        //   });
        // }
      }
    );
};
