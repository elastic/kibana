/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';

import type { ReadRuleExecutionResultsResponse } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  ReadRuleExecutionResultsRequestParams,
  ReadRuleExecutionResultsRequestBody,
  READ_RULE_EXECUTION_RESULTS_URL,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

export const readRuleExecutionResultsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: READ_RULE_EXECUTION_RESULTS_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(ReadRuleExecutionResultsRequestParams),
            body: buildRouteValidationWithZod(ReadRuleExecutionResultsRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ReadRuleExecutionResultsResponse>> => {
        const { ruleId } = request.params;
        const { filter, sort, page, per_page: perPage } = request.body;

        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['securitySolution']);
          const executionLog = ctx.securitySolution.getRuleExecutionLog();

          // Default to the last 2 hours when no filter is provided
          const effectiveFilter: NonNullable<ReadRuleExecutionResultsRequestBody['filter']> =
            filter ?? {
              from: moment().subtract(2, 'hours').toISOString(),
              to: moment().toISOString(),
              outcome: [],
              run_type: [],
            };

          const executionResultsResponse = await executionLog.getUnifiedExecutionResults({
            ruleId,
            filter: effectiveFilter,
            sort,
            page,
            perPage,
          });

          return response.ok({ body: executionResultsResponse });
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
