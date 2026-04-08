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
import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '../../../../../../../common/constants';
import type {
  FacetCounts,
  FindRulesWithFacetsResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  FindRulesWithFacetsRequestBody,
  validateFindRulesWithFacetsRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
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
          const reqBody = request.body;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();

          const combinedKql = buildGranularRulesKql({
            filter: reqBody.filter,
            search: reqBody.search,
          });

          const parsedSort = parseGranularSort(reqBody.sort);
          const sortField = parsedSort?.sortField;
          const sortOrder = parsedSort?.sortOrder;

          const cursorResult = resolveGranularFindCursor(reqBody.cursor, sortField, sortOrder);

          if (!cursorResult.ok) {
            return siemResponse.error({ statusCode: 400, body: cursorResult.error });
          }

          const { searchAfter, pit } = cursorResult;

          let ruleIds: string[] | undefined;
          let warnings: WarningSchema[] | undefined;

          const includeCounts = reqBody.aggregations?.counts ?? [];

          let counts: FacetCounts | undefined;

          const rules = await findRules({
            rulesClient,
            perPage: reqBody.per_page,
            page: searchAfter != null ? 1 : reqBody.page,
            sortField,
            sortOrder,
            filter: combinedKql,
            fields: reqBody.fields,
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
          const responseBody: FindRulesWithFacetsResponse = {
            ...base,
            ...(counts !== undefined ? { counts } : {}),
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
