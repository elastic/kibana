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
import type { GapReasonType } from '@kbn/alerting-plugin/common/constants/gap_reason';
import { MAX_RESULTS_WINDOW } from '../../../../../../usage/constants';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../../../../common/constants';
import type {
  SearchRulesField,
  SearchRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../../../../../common/api/detection_engine/rule_management/urls';
import { SearchRulesRequestBody } from '../../../../../../../common/api/detection_engine/rule_management';
import { validateSearchRulesRequestBody } from './request_schema_validation';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { buildGranularRulesKql } from '../../../logic/search/build_granular_rules_kql';
import {
  buildAggregations,
  expandRawAggregationResult,
} from '../../../logic/search/granular_facet_aggregations';
import { buildSiemResponse } from '../../../../routes/utils';
import { resolveGapPreFilter, transformFindAlerts } from '../../../utils/utils';

const REQUIRED_TRANSFORM_FIELDS: readonly SearchRulesField[] = [
  'schedule',
  'params',
  'updatedAt',
  'createdAt',
];

const resolveEffectiveFields = (fields: SearchRulesField[] | undefined): string[] | undefined =>
  fields?.length ? Array.from(new Set([...fields, ...REQUIRED_TRANSFORM_FIELDS])) : undefined;

/**
 * Internal route for listing rules with facets and deep pagination. To be made public in a future release.
 */
export const searchRulesRoute = (router: SecuritySolutionPluginRouter, _logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: RULE_MANAGEMENT_RULES_URL_SEARCH,
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
            body: buildRouteValidationWithZod(SearchRulesRequestBody),
          },
        },
      },
      // eslint-disable-next-line complexity
      async (context, request, response): Promise<IKibanaResponse<SearchRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const validationErrors = validateSearchRulesRequestBody(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const {
            filter,
            search,
            sort_field: sortField,
            sort_order: sortOrder,
            search_after: searchAfterParam,
            page = 1,
            per_page: perPage,
            fields,
            aggregations,
            gap_fill_statuses: gapFillStatuses,
            gaps_range_start: gapsRangeStart,
            gaps_range_end: gapsRangeEnd,
            gap_auto_fill_scheduler_id: schedulerId,
          } = request.body;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();

          const combinedKql = buildGranularRulesKql({
            filter,
            search,
          });

          const hasGapFilters =
            gapFillStatuses && gapFillStatuses.length > 0 && gapsRangeStart && gapsRangeEnd;

          const shouldUseSearchAfter =
            sortField != null &&
            sortOrder != null &&
            !hasGapFilters &&
            (page * perPage >= MAX_RESULTS_WINDOW || searchAfterParam);

          const ruleIdsWithGaps: string[] = [];
          const warnings: WarningSchema[] = [];

          if (hasGapFilters) {
            const uiSettingsClient = ctx.core.uiSettings.client;
            const excludedReasons = await uiSettingsClient.get<GapReasonType[]>(
              EXCLUDED_GAP_REASONS_KEY
            );

            const gapPreFilter = await resolveGapPreFilter({
              rulesClient,
              filter: combinedKql,
              sortField,
              sortOrder,
              gapFillStatuses,
              gapsRangeStart,
              gapsRangeEnd,
              excludedReasons,
              schedulerId,
            });

            if (gapPreFilter.ruleIds.length === 0) {
              return response.ok({
                body: {
                  page,
                  perPage,
                  total: 0,
                  data: [],
                  ...(gapPreFilter.warnings.length > 0 ? { warnings: gapPreFilter.warnings } : {}),
                },
              });
            }

            ruleIdsWithGaps.push(...gapPreFilter.ruleIds);
            warnings.push(...gapPreFilter.warnings);
          }

          const categoryCounts = aggregations?.counts ?? [];

          const aggs =
            categoryCounts.length > 0
              ? buildAggregations({ categories: categoryCounts })
              : undefined;

          const effectiveFields = resolveEffectiveFields(fields);

          const rules = await findRules({
            rulesClient,
            perPage,
            page: shouldUseSearchAfter ? undefined : page,
            sortField,
            sortOrder,
            filter: combinedKql,
            fields: effectiveFields,
            searchAfter: shouldUseSearchAfter ? searchAfterParam : undefined,
            aggregations: aggs,
            ruleIds: hasGapFilters ? ruleIdsWithGaps : undefined,
          });

          const counts = rules.aggregations
            ? expandRawAggregationResult(rules.aggregations, categoryCounts)
            : undefined;

          const transformedRules = transformFindAlerts(
            rules,
            hasGapFilters && warnings.length > 0 ? warnings : undefined
          );

          const responseBody: SearchRulesResponse = {
            ...transformedRules,
            ...(counts ? { counts } : {}),
            ...(shouldUseSearchAfter ? { search_after: rules.searchAfter } : {}),
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
