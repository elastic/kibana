/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { ReviewRuleInstallationField } from '../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import type {
  FindRulesSortField,
  GranularRulesSearch,
  SearchRulesAggregations,
} from '../../../../../../common/api/detection_engine/rule_management';
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
import {
  buildAggregations,
  expandRawAggregationResult,
} from '../../../rule_management/logic/search/granular_facet_aggregations';

// Identity fields always returned regardless of `fields`, so callers can still
// match results to rules. Kept in sync with the installation-review baseline.
const REVIEW_UPGRADE_BASELINE_FIELDS: ReadonlySet<ReviewRuleInstallationField> = new Set([
  'rule_id',
  'id',
  'version',
  'type',
  'name',
  'immutable',
  'rule_source',
]);

const applyFieldSelectionToRules = (
  rules: RuleUpgradeInfoForReview[],
  fields: ReviewRuleInstallationField[] | undefined
): RuleUpgradeInfoForReview[] => {
  if (!fields?.length) {
    return rules;
  }
  const allowed = new Set<ReviewRuleInstallationField>([
    ...fields,
    ...REVIEW_UPGRADE_BASELINE_FIELDS,
  ]);
  const narrow = (rule: RuleResponse): RuleResponse =>
    Object.fromEntries(
      Object.entries(rule).filter(([key]) => allowed.has(key as ReviewRuleInstallationField))
    ) as RuleResponse;

  return rules.map((entry) => ({
    ...entry,
    current_rule: narrow(entry.current_rule),
    target_rule: narrow(entry.target_rule),
  }));
};

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
      `reviewRuleUpgradeHandler: Executing handler with params: page=${page}, perPage=${perPage}, filter=${filter}, search=${JSON.stringify(
        search
      )}, aggregations=${JSON.stringify(aggregations)}, sort=${JSON.stringify(
        sort
      )}, fields=${JSON.stringify(fields)}`
  );

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const firstSort = sort?.[0];

    const {
      rules: upgradeInfo,
      total,
      counts,
    } = await calculateUpgradeableRulesDiff({
      rulesClient,
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
      rules: applyFieldSelectionToRules(upgradeInfo, fields),
      page,
      per_page: perPage,
      total,
      ...(counts ? { counts } : {}),
    };

    return response.ok({ body });
  } catch (err) {
    logger.error(`reviewRuleUpgradeHandler: Caught error`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

interface CalculateUpgradeableRulesDiffArgs {
  rulesClient: RulesClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  mlAuthz: MlAuthz;
  page: number;
  perPage: number;
  sortField: FindRulesSortField | undefined;
  sortOrder: SortOrder | undefined;
  filter: string | undefined;
  search: GranularRulesSearch | undefined;
  aggregations: SearchRulesAggregations | undefined;
}

async function calculateUpgradeableRulesDiff({
  rulesClient,
  ruleAssetsClient,
  ruleObjectsClient,
  mlAuthz,
  page,
  perPage,
  sortField,
  sortOrder,
  filter,
  search,
  aggregations,
}: CalculateUpgradeableRulesDiffArgs) {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((version) => [version.rule_id, version]));

  const combinedKql = buildGranularRulesKql({ filter, search });

  // Push the user-supplied KQL down into the installed-rules SO fetch so single-rule lookups
  // (e.g. filtering by `rule_id`) don't pull every prebuilt rule and then narrow afterwards.
  const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions({
    kqlFilter: combinedKql,
  });

  const installedVersionsByRuleId = new Map<string, RuleSummary>(
    installedRuleVersions.map((version) => [version.rule_id, version])
  );

  const upgradeableRules = await getPossibleUpgrades(
    installedRuleVersions,
    latestVersionsMap,
    mlAuthz
  );

  const upgradeableSoIds = upgradeableRules
    .map((upgrade) => installedVersionsByRuleId.get(upgrade.rule_id)?.id)
    .filter((id): id is string => id != null);

  if (upgradeableSoIds.length === 0) {
    return { rules: [], total: 0, counts: undefined };
  }

  const categoryCounts = aggregations?.counts ?? [];
  const aggs =
    categoryCounts.length > 0 ? buildAggregations({ categories: categoryCounts }) : undefined;

  const findResult = await findRules({
    rulesClient,
    filter: combinedKql,
    ruleIds: upgradeableSoIds,
    sortField,
    sortOrder,
    page,
    perPage,
    fields: undefined,
    aggregations: aggs,
  });

  const pagedCurrentRules = findResult.data.map((rule) => internalRuleToAPIResponse(rule));

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

  const counts = findResult.aggregations
    ? expandRawAggregationResult(findResult.aggregations as Record<string, unknown>, categoryCounts)
    : undefined;

  return {
    rules: upgradeInfo,
    total: findResult.total,
    counts,
  };
}
