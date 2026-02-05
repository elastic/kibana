/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';
import {
  DETECTION_ENGINE_RULES_URL_FIND,
  MAX_RULES_WITH_GAPS_TO_FETCH,
  MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
} from '../../../../../../../common/constants';
import type { FindRulesResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  FindRulesRequestQuery,
  validateFindRulesRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { getGapFilteredRuleIds } from '../../../logic/search/get_gap_filtered_rule_ids';
import { buildSiemResponse } from '../../../../routes/utils';
import { transformFindAlerts } from '../../../utils/utils';

export const findRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL_FIND,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindRulesRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const validationErrors = validateFindRulesRequestQuery(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();

          let ruleIds: string[] | undefined;
          let warnings: WarningSchema[] | undefined;
          const gapFillStatuses = (query.gap_fill_statuses ?? []) as GapFillStatus[];

          if (gapFillStatuses.length > 0 && query.gaps_range_start && query.gaps_range_end) {
            const { ruleIds: gapRuleIds, truncated } = await getGapFilteredRuleIds({
              rulesClient,
              gapRange: {
                start: query.gaps_range_start,
                end: query.gaps_range_end,
              },
              gapFillStatuses,
              maxRuleIds: MAX_RULES_WITH_GAPS_TO_FETCH,
              filter: query.filter,
              sortField: query.sort_field,
              sortOrder: query.sort_order,
            });

            if (truncated) {
              warnings = [
                {
                  type: MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
                  message: `Only the first ${MAX_RULES_WITH_GAPS_TO_FETCH} rules with gaps in the selected time range are returned. Additional rules with gaps are not included in this response.`,
                  actionPath: '',
                },
              ];
            }

            if (gapRuleIds.length === 0) {
              const emptyRules = transformFindAlerts(
                {
                  data: [],
                  page: query.page,
                  perPage: query.per_page,
                  total: 0,
                },
                warnings
              );
              return response.ok({ body: emptyRules });
            }

            ruleIds = gapRuleIds;
          }

          const rules = await findRules({
            rulesClient,
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: query.filter,
            fields: query.fields,
            ruleIds,
          });

          const transformed = transformFindAlerts(rules, warnings);
          return response.ok({ body: transformed ?? {} });
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
