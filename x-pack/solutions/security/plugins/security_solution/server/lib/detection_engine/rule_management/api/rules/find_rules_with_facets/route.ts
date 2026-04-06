/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { GapFillStatus } from '@kbn/alerting-plugin/common/constants/gap_status';
import {
  DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
  MAX_RULES_WITH_GAPS_TO_FETCH,
  MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
} from '../../../../../../../common/constants';
import type {
  FacetCounts,
  FindRulesWithFacetsResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  FindRulesWithFacetsRequestQuery,
  validateFindRulesWithFacetsRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { getGapFilteredRuleIds } from '../../../logic/search/get_gap_filtered_rule_ids';
import { buildGranularRulesKql } from '../../../logic/search/build_granular_rules_kql';
import { parseGranularSort } from '../../../logic/search/parse_granular_sort';
import { computeGranularFacetCounts } from '../../../logic/search/compute_granular_facet_counts';
import { resolveGranularFindCursor } from '../../../logic/search/resolve_granular_find_cursor';
import { buildSiemResponse } from '../../../../routes/utils';
import { transformFindAlerts } from '../../../utils/utils';

/**
 * Internal route for listing rules with facets and deep pagination. To be made public in a future release.
 */
export const findRulesWithFacetsRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS,
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
            query: buildRouteValidationWithZod(FindRulesWithFacetsRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindRulesWithFacetsResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const validationErrors = validateFindRulesWithFacetsRequestQuery(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const { query } = request;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();

          const combinedKql = buildGranularRulesKql({
            filter: query.filter,
            search: query.search,
          });

          const parsedSort = parseGranularSort(query.sort);
          const sortField = parsedSort?.sortField;
          const sortOrder = parsedSort?.sortOrder;

          const cursorResult = resolveGranularFindCursor(query.cursor, sortField, sortOrder);

          if (!cursorResult.ok) {
            return siemResponse.error({ statusCode: 400, body: cursorResult.error });
          }
          const { searchAfter, pit } = cursorResult;

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
              filter: combinedKql,
              sortField,
              sortOrder,
              schedulerId: query.gap_auto_fill_scheduler_id,
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
              const emptyBody: FindRulesWithFacetsResponse = {
                ...transformFindAlerts(
                  {
                    data: [],
                    page: query.page,
                    perPage: query.per_page,
                    total: 0,
                  },
                  warnings
                ),
              };
              return response.ok({ body: emptyBody });
            }

            ruleIds = gapRuleIds;
          }

          const includeCounts = query.include_counts ?? [];

          let counts: FacetCounts | undefined;

          const rules = await findRules({
            rulesClient,
            perPage: query.per_page,
            page: searchAfter != null ? 1 : query.page,
            sortField,
            sortOrder,
            filter: combinedKql,
            fields: query.fields,
            ruleIds,
            searchAfter,
            pit,
          });

          if (includeCounts.length > 0) {
            counts = await computeGranularFacetCounts({
              rulesClient,
              filter: combinedKql,
              ruleIds,
              categories: includeCounts,
            });
          }

          const base = transformFindAlerts(rules, warnings);
          const body: FindRulesWithFacetsResponse = {
            ...base,
            ...counts,
          };

          return response.ok({ body });
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
