/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';

import type { GetRuleExecutionEventsResponse } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  GET_RULE_EXECUTION_EVENTS_URL,
  GetRuleExecutionEventsRequestParams,
  GetRuleExecutionEventsRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

/**
 * Returns execution events of a given rule (e.g. status changes) from Event Log.
 * Accepts rule's saved object ID (`rule.id`) and options for filtering, sorting and pagination.
 */
export const getRuleExecutionEventsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_RULE_EXECUTION_EVENTS_URL,
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
            params: buildRouteValidationWithZod(GetRuleExecutionEventsRequestParams),
            query: buildRouteValidationWithZod(GetRuleExecutionEventsRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetRuleExecutionEventsResponse>> => {
        const { params, query } = request;
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['securitySolution']);
          const executionLog = ctx.securitySolution.getRuleExecutionLog();
          const executionEventsResponse = await executionLog.getExecutionEvents({
            ruleId: params.ruleId,
            searchTerm: query.search_term,
            eventTypes: query.event_types,
            logLevels: query.log_levels,
            dateStart: query.date_start,
            dateEnd: query.date_end,
            sortOrder: query.sort_order,
            page: query.page,
            perPage: query.per_page,
          });

          return response.ok({ body: executionEventsResponse });
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
