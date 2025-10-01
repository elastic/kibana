/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AggregatedGapStatus } from '@kbn/alerting-plugin/common';
import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../../common/constants';
import type { FindRulesResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  FindRulesRequestQuery,
  validateFindRulesRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { transformFindAlerts } from '../../../utils/utils';

export const findRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL_FIND,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
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
          // Filter by aggregated gap status if requested (unified API)

          if (query.gap_status) {
            const aggregatedResult = await rulesClient.getRuleIdsWithGaps({
              aggregatedStatuses: [query.gap_status],
            });
            const filteredIds = aggregatedResult.ruleIds;
            if (filteredIds.length === 0) {
              const emptyRules = transformFindAlerts({
                data: [],
                page: query.page,
                perPage: query.per_page,
                total: 0,
              });
              return response.ok({ body: emptyRules });
            }
            ruleIds = filteredIds;
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
          // Optional enrichment: aggregated gap status per rule
          if (query.include_gap_status) {
            const pageRuleIds = rules.data.map((r) => r.id);
            if (pageRuleIds.length > 0) {
              const summaries = await rulesClient.getAggregatedGapStatusByRuleIds({
                ruleIds: pageRuleIds,
              });
              rules.data = rules.data.map((r) => {
                const summary = summaries[r.id] as (typeof summaries)[string] &
                  Partial<{
                    sums: {
                      unfilled_ms: number;
                      in_progress_ms: number;
                      filled_ms: number;
                      total_ms: number;
                    };
                  }>;

                const status = summary?.status ?? null;
                const sums = summary?.sums;
                const latestUpdate = (summary as unknown as { latestUpdate?: string })
                  ?.latestUpdate;
                return {
                  ...r,
                  // Unified gaps object containing status and durations
                  gaps: {
                    status,
                    durations_ms: {
                      in_progress_ms: Math.max(0, sums?.in_progress_ms ?? 0),
                      unfilled_ms: Math.max(0, sums?.unfilled_ms ?? 0),
                      filled_ms: Math.max(0, sums?.filled_ms ?? 0),
                      total_ms: Math.max(0, sums?.total_ms ?? 0),
                    },
                    ...(latestUpdate ? { latest_update: latestUpdate } : {}),
                  } as {
                    status: AggregatedGapStatus;
                    durations_ms: {
                      in_progress_ms: number;
                      unfilled_ms: number;
                      filled_ms: number;
                      total_ms: number;
                    };
                    latest_update?: string;
                  },
                } as typeof r;
              }) as typeof rules.data;
            }
          }

          const transformed = transformFindAlerts(rules);
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
