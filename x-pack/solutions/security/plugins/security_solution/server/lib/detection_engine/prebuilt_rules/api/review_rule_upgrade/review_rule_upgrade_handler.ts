/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  FindRulesSortField,
  GranularRulesFilter,
  GranularRulesSearch,
  SearchRulesAggregations,
} from '../../../../../../common/api/detection_engine/rule_management';
import type { FacetCounts } from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import type { RuleResponse, SortOrder } from '../../../../../../common/api/detection_engine';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { IPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import type {
  IPrebuiltRuleObjectsClient,
  RuleSummary,
} from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { type RuleVersionSpecifier } from '../../logic/rule_versions/rule_version_specifier';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { calculateRuleUpgradeInfo } from './calculate_rule_upgrade_info';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { getPossibleUpgrades } from '../../logic/utils';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/logic/detection_rules_client/converters/internal_rule_to_api_response';
import { buildGranularRulesKql } from '../../../rule_management/logic/search/build_granular_rules_kql';
import { fetchGranularFacetCounts } from '../../../rule_management/logic/search/granular_facet_aggregations';
import { narrowRuleResponseFields } from '../narrow_rule_response_fields';

export const reviewRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ReviewRuleUpgradeRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);
  const {
    page = 1,
    per_page: perPage = 20,
    filter,
    search,
    aggregations,
    sort,
    fields,
  } = request.body ?? {};

  logger.debug(
    () =>
      `reviewRuleUpgradeHandler: Executing handler with params: page=${page}, perPage=${perPage}`
  );

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    // Only the first sort criterion is used; multi-sort is reserved for future expansion.
    const firstSort = sort?.[0];

    const {
      rules: upgradeInfo,
      total,
      counts,
    } = await calculateUpgradeableRulesDiff({
      rulesClient,
      savedObjectsClient: soClient,
      ruleAssetsClient,
      ruleObjectsClient,
      mlAuthz,
      page,
      perPage,
      sortField: firstSort?.field,
      sortOrder: firstSort?.order,
      filter,
      search,
      aggregations,
    });

    const body: ReviewRuleUpgradeResponseBody = {
      stats: {
        num_rules_to_upgrade_total: 0,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
        tags: [],
      },
      rules: upgradeInfo.map((entry) => ({
        ...entry,
        // Casts are safe: the response is immediately serialised to JSON; the
        // OpenAPI schema types these as RuleResponse but the `fields` parameter
        // makes them projections — only the requested fields plus
        // REVIEW_RULE_BASELINE_FIELDS are guaranteed to be present.
        current_rule: narrowRuleResponseFields(entry.current_rule, fields) as RuleResponse,
        target_rule: narrowRuleResponseFields(entry.target_rule, fields) as RuleResponse,
      })),
      page,
      per_page: perPage,
      total,
      ...(counts ? { counts } : {}),
    };

    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

interface CalculateUpgradeableRulesDiffArgs {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  mlAuthz: MlAuthz;
  page: number;
  perPage: number;
  sortField: FindRulesSortField | undefined;
  sortOrder: SortOrder | undefined;
  filter: GranularRulesFilter | undefined;
  search: GranularRulesSearch | undefined;
  aggregations: SearchRulesAggregations | undefined;
}

export async function calculateUpgradeableRulesDiff({
  rulesClient,
  savedObjectsClient,
  ruleAssetsClient,
  ruleObjectsClient,
  mlAuthz,
  page,
  perPage,
  sortField = 'name',
  sortOrder = 'asc',
  filter,
  search,
  aggregations,
}: CalculateUpgradeableRulesDiffArgs) {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((version) => [version.rule_id, version]));

  const combinedKql = buildGranularRulesKql({ filter, search });
  const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions({
    kqlFilter: combinedKql,
    sortField,
    sortOrder,
  });

  const installedVersionsByRuleId = new Map<string, RuleSummary>(
    installedRuleVersions.map((version) => [version.rule_id, version])
  );

  const upgradeableRules = await getPossibleUpgrades(
    installedRuleVersions,
    latestVersionsMap,
    mlAuthz
  );

  const upgradeableSoIds = upgradeableRules.flatMap((upgrade) => {
    const summary = installedVersionsByRuleId.get(upgrade.rule_id);
    return summary ? [summary.id] : [];
  });

  if (upgradeableSoIds.length === 0) {
    return { rules: [], total: 0, counts: undefined };
  }

  const pagedSoIds = upgradeableSoIds.slice((page - 1) * perPage, page * perPage);

  // fetch pre-paged id list (<= perPage) so the OR-expanded
  // KQL clause stays well-bounded. `combinedKql` is intentionally not re-passed
  // here as it was already applied to the installed rule versions fetch.
  const pageResult =
    pagedSoIds.length === 0
      ? { data: [] }
      : await findRules({
          rulesClient,
          filter: undefined,
          ruleIds: pagedSoIds,
          sortField,
          sortOrder,
          page: 1,
          perPage: pagedSoIds.length,
          fields: undefined,
          aggregations: undefined,
        });

  const pagedCurrentRules = pageResult.data.map((rule) => internalRuleToAPIResponse(rule));

  const categoryCounts = aggregations?.counts ?? [];
  let counts: FacetCounts | undefined;

  if (categoryCounts.length > 0) {
    counts = await fetchGranularFacetCounts({
      savedObjectsClient,
      ruleIds: upgradeableSoIds,
      categories: categoryCounts,
    });
  }

  const baseVersions: RuleVersionSpecifier[] = pagedCurrentRules.map((rule) => ({
    rule_id: rule.rule_id,
    version: rule.version,
  }));
  const targetVersions: RuleVersionSpecifier[] = pagedCurrentRules.flatMap((rule) => {
    const latest = latestVersionsMap.get(rule.rule_id);
    return latest ? [{ rule_id: latest.rule_id, version: latest.version }] : [];
  });

  const [latestAssetsResult, baseAssetsResult] = await Promise.all([
    ruleAssetsClient.fetchAssetsByVersion(targetVersions),
    ruleAssetsClient.fetchAssetsByVersion(baseVersions),
  ]);

  const ruleVersionsMap = zipRuleVersions(
    pagedCurrentRules,
    baseAssetsResult.assets,
    latestAssetsResult.assets
  );

  const diffResults = pagedCurrentRules.map((current) => {
    const base = ruleVersionsMap.get(current.rule_id)?.base;
    const target = ruleVersionsMap.get(current.rule_id)?.target;
    return calculateRuleDiff({ current, base, target });
  });

  const upgradeInfo = calculateRuleUpgradeInfo(diffResults);

  return {
    rules: upgradeInfo,
    total: upgradeableSoIds.length,
    counts,
  };
}
