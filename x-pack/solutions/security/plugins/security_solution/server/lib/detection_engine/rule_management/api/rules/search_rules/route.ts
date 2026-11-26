/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { GapReasonType } from '@kbn/alerting-plugin/common/constants/gap_reason';
import type { RuleSetConditions } from '../../../../../../../common/api/detection_engine/rule_sets';
import { MAX_RESULTS_WINDOW } from '../../../../../../usage/constants';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../../../../common/constants';
import type { SearchRulesResponse } from '../../../../../../../common/api/detection_engine/rule_management';
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
import { translateSearchFieldsToSoFields } from '../../../logic/search/search_rules_field_translation';
import { getRuleSetsClient } from '../../../../rule_sets/api/register_routes';
import { resolveRuleScopeMembership } from '../../../logic/search/rule_scope';
import { fetchDisjunctiveFacetCounts } from '../../../logic/search/facet_counts';
import { resolveSemanticSearch } from '../../../logic/search/semantic';
import { isRuleSearchWorkflowEnabled } from '../../../../../../workflows/rule_search_workflow/status';
import type { StartPlugins } from '../../../../../../plugin_contract';
import {
  buildConditionsFilter,
  buildRuleSetFilter,
} from '../../../../rule_sets/logic/build_rule_set_filter';

/** One page of rules in relevance order (`relevantIds` is best first). */
const orderByRelevance = <T extends { data: Array<{ id: string }> }>(
  found: T,
  relevantIds: string[],
  page: number,
  perPage: number
): T & { page: number; perPage: number } => {
  const rank = new Map(relevantIds.map((id, index) => [id, index]));
  const ordered = [...found.data].sort(
    (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity)
  );
  return { ...found, page, perPage, data: ordered.slice((page - 1) * perPage, page * perPage) };
};

/**
 * Internal route for listing rules with facets and deep pagination. To be made public in a future release.
 */
export const searchRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
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
            rule_scope: ruleScope,
            filter_params: filterParams,
          } = request.body;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();
          const membership = await resolveRuleScopeMembership(ruleScope, () =>
            getRuleSetsClient(context)
          );
          const scopeFilter = membership && buildRuleSetFilter(membership);
          const and = (nodes: Array<KueryNode | undefined>) => {
            const present = nodes.filter((node): node is KueryNode => node != null);
            return present.length ? nodeBuilder.and(present) : undefined;
          };
          const ruleSetFilter = and([
            scopeFilter,
            filterParams ? buildConditionsFilter(filterParams) : undefined,
          ]);
          // The facets are `filter_params` on top of the scope; without them, the facets are the
          // conditions of the scope itself (the rules page edits a set in place).
          const facets = filterParams
            ? {
                conditions: filterParams,
                filterFor: (conditions: RuleSetConditions) =>
                  and([scopeFilter, buildConditionsFilter(conditions)]),
              }
            : membership && {
                conditions: membership.conditions,
                filterFor: (conditions: RuleSetConditions) =>
                  buildRuleSetFilter({ ...membership, conditions }),
              };

          // Semantic search: the relevant rules (best first) come from the rule search index.
          // With facets, a rule set or a KQL filter, only the rules they keep are ranked: ranking
          // the whole space first would push most rules of a small subset out of the top.
          const wantsSemantic = search?.mode === 'semantic' && Boolean(search.term.trim());
          const baseKql = buildGranularRulesKql({ filter, search: undefined });
          const subset =
            wantsSemantic && (baseKql || ruleSetFilter)
              ? await findRules({
                  rulesClient,
                  filter: baseKql,
                  kueryFilter: ruleSetFilter,
                  fields: ['updatedAt'],
                  sortField: undefined,
                  sortOrder: undefined,
                  page: 1,
                  perPage: MAX_RESULTS_WINDOW,
                })
              : undefined;
          // Larger subsets than one page are ranked in the whole space and filtered after.
          const candidateIds =
            subset && subset.total <= MAX_RESULTS_WINDOW
              ? subset.data.map((rule) => rule.id)
              : undefined;
          const semantic =
            wantsSemantic && search
              ? await resolveSemanticSearch({
                  esClient: ctx.core.elasticsearch.client.asInternalUser,
                  uiSettings: ctx.core.uiSettings.client,
                  spaceId: ctx.securitySolution.getSpaceId(),
                  isWorkflowEnabled: async (spaceId) =>
                    isRuleSearchWorkflowEnabled(
                      (
                        await getStartServices()
                      )[1].workflowsExtensions,
                      spaceId
                    ),
                  term: search.term.trim(),
                  candidateIds,
                  logger,
                })
              : undefined;
          const relevantIds = semantic?.mode === 'semantic' ? semantic.ruleIds : undefined;
          const searchMode = search ? semantic?.mode ?? 'legacy' : undefined;
          const modeFields = {
            ...(searchMode ? { search_mode: searchMode } : {}),
            ...(semantic?.mode === 'legacy' ? { search_fallback_reason: semantic.reason } : {}),
          };

          const combinedKql = buildGranularRulesKql({
            filter,
            search: search && !relevantIds ? { ...search, mode: 'legacy' } : undefined,
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
              kueryFilter: ruleSetFilter,
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

          const gapIds = hasGapFilters ? new Set(ruleIdsWithGaps) : undefined;
          const ruleIds =
            relevantIds && gapIds
              ? relevantIds.filter((id) => gapIds.has(id))
              : relevantIds ?? (hasGapFilters ? ruleIdsWithGaps : undefined);
          if (ruleIds && ruleIds.length === 0) {
            return response.ok({
              body: {
                page,
                perPage,
                total: 0,
                data: [],
                ...modeFields,
              },
            });
          }
          // Semantic results come in relevance order: all relevant rules that pass the filters
          // are loaded (at most a few hundred), ordered, then paged here.
          const byRelevance = Boolean(relevantIds);

          const categoryCounts = aggregations?.counts ?? [];

          const aggs =
            categoryCounts.length > 0
              ? buildAggregations({ categories: categoryCounts })
              : undefined;

          const effectiveFields = translateSearchFieldsToSoFields(fields);

          const found = await findRules({
            rulesClient,
            perPage: byRelevance && ruleIds ? ruleIds.length : perPage,
            page: byRelevance ? 1 : shouldUseSearchAfter ? undefined : page,
            sortField: byRelevance ? undefined : sortField,
            sortOrder: byRelevance ? undefined : sortOrder,
            filter: combinedKql,
            kueryFilter: ruleSetFilter,
            fields: effectiveFields,
            searchAfter: shouldUseSearchAfter && !relevantIds ? searchAfterParam : undefined,
            aggregations: aggs,
            ruleIds,
          });
          const rules =
            byRelevance && relevantIds
              ? orderByRelevance(found, relevantIds, page, perPage)
              : found;

          const mainCounts = rules.aggregations
            ? expandRawAggregationResult(rules.aggregations, categoryCounts)
            : undefined;
          const tagCategories = aggregations?.tag_categories ?? [];
          const disjunctive =
            mainCounts && facets && (aggregations?.exclude_own_filter || tagCategories.length)
              ? await fetchDisjunctiveFacetCounts({
                  rulesClient,
                  filter: combinedKql,
                  ...facets,
                  mainCounts,
                  categories: aggregations?.exclude_own_filter ? categoryCounts : [],
                  tagCategories,
                  ruleIds,
                })
              : undefined;
          const counts = disjunctive?.counts ?? mainCounts;
          const searchHighlights =
            semantic?.mode === 'semantic'
              ? Object.fromEntries(
                  rules.data.flatMap(({ id }) =>
                    semantic.snippets[id] ? [[id, semantic.snippets[id]]] : []
                  )
                )
              : {};

          const transformedRules = transformFindAlerts(
            rules,
            hasGapFilters && warnings.length > 0 ? warnings : undefined
          );

          const responseBody: SearchRulesResponse = {
            ...transformedRules,
            ...(counts ? { counts } : {}),
            ...(disjunctive && tagCategories.length
              ? { tag_category_counts: disjunctive.tagCategoryCounts }
              : {}),
            ...(shouldUseSearchAfter && !relevantIds ? { search_after: rules.searchAfter } : {}),
            ...modeFields,
            ...(Object.keys(searchHighlights).length
              ? { search_highlights: searchHighlights }
              : {}),
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
