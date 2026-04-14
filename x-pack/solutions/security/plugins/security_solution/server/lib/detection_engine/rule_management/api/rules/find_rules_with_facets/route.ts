/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import { MAX_RESULTS_WINDOW } from '../../../../../../usage/constants';
import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '../../../../../../../common/constants';
import type {
  FindRulesWithFacetsField,
  FindRulesWithFacetsResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import {
  FindRulesWithFacetsRequestBody,
  validateFindRulesWithFacetsRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { buildGranularRulesKql } from '../../../logic/search/build_granular_rules_kql';
import {
  buildAggregations,
  expandRawAggregationResult,
} from '../../../logic/search/granular_facet_aggregations';
import { buildSiemResponse } from '../../../../routes/utils';
import { transformFindAlerts } from '../../../utils/utils';
import { enrichFilterWithRuleTypeMapping } from '../../../logic/search/enrich_filter_with_rule_type_mappings';
import { expandFriendlyKqlFields } from '../../../../../../../common/api/detection_engine/rule_management/find_rules_with_facets/expand_friendly_kql_fields';

// Fields required for the rule transformation process.
const REQUIRED_TRANSFORM_FIELDS: readonly FindRulesWithFacetsField[] = [
  'schedule',
  'params',
  'updatedAt',
  'createdAt',
];

/**
 * Internal route for listing rules with facets and deep pagination. To be made public in a future release.
 */
export const findRulesWithFacetsRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(FindRulesWithFacetsRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindRulesWithFacetsResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const validationErrors = validateFindRulesWithFacetsRequestBody(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const {
            filter,
            search,
            sort_field: sortField,
            sort_order: sortOrder,
            search_after: searchAfterInput,
            page = 1,
            per_page,
            fields,
            aggregations,
          } = request.body;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();

          const expandedFilter = filter ? expandFriendlyKqlFields(filter) : undefined;

          const combinedKql = buildGranularRulesKql({
            filter: expandedFilter,
            search,
          });

          const searchAfter: SortResults | undefined =
            searchAfterInput != null && searchAfterInput.length > 0
              ? ([...searchAfterInput] as SortResults)
              : undefined;

          const categoryCounts = aggregations?.counts ?? [];

          const aggs =
            categoryCounts.length > 0
              ? buildAggregations({
                  categories: categoryCounts,
                })
              : undefined;

          const enrichedFilter = enrichFilterWithRuleTypeMapping(combinedKql);

          // When the caller requests a subset of fields we add in the ones required for the rule transformation pipeline.
          const effectiveFields = fields?.length
            ? Array.from(new Set([...fields, ...REQUIRED_TRANSFORM_FIELDS]))
            : undefined;

          const rules = await findRules({
            rulesClient,
            perPage: per_page,
            page: searchAfter ? undefined : page,
            sortField,
            sortOrder,
            filter: enrichedFilter,
            fields: effectiveFields,
            searchAfter,
            aggregations: aggs,
          });

          const counts = rules.aggregations
            ? expandRawAggregationResult(rules.aggregations, categoryCounts)
            : undefined;

          const transformedRules = transformFindAlerts(rules);

          const shouldReturnSearchAfter =
            sortField != null &&
            sortOrder != null &&
            (page * per_page >= MAX_RESULTS_WINDOW || searchAfter);

          const responseSearchAfter =
            shouldReturnSearchAfter && rules.searchAfter ? rules.searchAfter : undefined;

          const responseBody: FindRulesWithFacetsResponse = {
            ...transformedRules,
            ...(counts !== undefined ? { counts } : {}),
            ...(responseSearchAfter !== undefined ? { search_after: responseSearchAfter } : {}),
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
