/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core/server';

import type { GetRuleHealthResponse } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  GetRuleHealthRequestBody,
  GET_RULE_HEALTH_URL,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { calculateHealthTimings } from '../health_timings';
import { validateGetRuleHealthRequest } from './get_rule_health_request';

/**
 * Get health overview of a rule. Scope: a given detection rule in the current Kibana space.
 * Returns:
 * - health state at the moment of the API call (rule and its execution summary)
 * - health stats over a specified period of time ("health interval")
 * - health stats history within the same interval in the form of a histogram
 *   (the same stats are calculated over each of the discreet sub-intervals of the whole interval)
 */
export const getRuleHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: GET_RULE_HEALTH_URL,
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
            body: buildRouteValidation(GetRuleHealthRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetRuleHealthResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const params = validateGetRuleHealthRequest(request.body);

          const ctx = await context.resolve(['securitySolution']);
          const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();

          const ruleHealthParameters = { interval: params.interval, rule_id: params.ruleId };
          const ruleHealth = await healthClient.calculateRuleHealth(ruleHealthParameters);

          const responseBody: GetRuleHealthResponse = {
            timings: calculateHealthTimings(params.requestReceivedAt),
            parameters: ruleHealthParameters,
            health: {
              ...ruleHealth,
              debug: params.debug ? ruleHealth.debug : undefined,
            },
          };

          return response.ok({ body: responseBody });
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
