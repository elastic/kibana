/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse, RuleToImport } from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { internalRuleToAPIResponse } from '../detection_rules_client/converters/internal_rule_to_api_response';
import { findRules } from '../search/find_rules';

/**
 * Everything the import path needs to know about a batch of rules before it
 * classifies them as create-vs-overwrite and calculates `rule_source`:
 *
 * - `matchingAssetsByRuleId`  — prebuilt asset for the imported `(rule_id, version)`
 * - `availableRuleAssetIds`   — set of `rule_id`s the current prebuilt package (or
 *                               its deprecated tail) recognises
 * - `installedRulesById`      — rules already installed at these `rule_id`s
 *
 * Populated in a single call so we can (a) classify conflicts without a second
 * ES round-trip and (b) feed `calculateRuleSourceForImport` directly.
 */
export interface PrebuiltImportContext {
  matchingAssetsByRuleId: Record<string, PrebuiltRuleAsset>;
  availableRuleAssetIds: Set<string>;
  installedRulesById: Record<string, RuleResponse>;
}

export const fetchPrebuiltImportContext = async ({
  rules,
  rulesClient,
  ruleAssetsClient,
}: {
  rules: RuleToImport[];
  rulesClient: RulesClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
}): Promise<PrebuiltImportContext> => {
  const ruleIds = rules.map((r) => r.rule_id);
  const ruleVersions = rules.flatMap((r) =>
    r.version == null ? [] : [{ rule_id: r.rule_id, version: r.version }]
  );

  const [latestAssets, deprecatedAssets, matchingAssets, installedRules] = await Promise.all([
    ruleAssetsClient.fetchLatestVersions({ ruleIds }),
    ruleAssetsClient.fetchDeprecatedRules(ruleIds),
    ruleAssetsClient.fetchAssetsByVersion(ruleVersions).then((r) => r.assets),
    findInstalledRulesByRuleIds({ rulesClient, ruleIds }),
  ]);

  const matchingAssetsByRuleId: Record<string, PrebuiltRuleAsset> = {};
  for (const asset of matchingAssets) {
    matchingAssetsByRuleId[asset.rule_id] = asset;
  }

  const availableRuleAssetIds = new Set<string>([
    ...latestAssets.map((s) => s.rule_id),
    ...deprecatedAssets.map((s) => s.rule_id),
  ]);

  const installedRulesById: Record<string, RuleResponse> = {};
  for (const rule of installedRules) {
    installedRulesById[rule.rule_id] = rule;
  }

  return { matchingAssetsByRuleId, availableRuleAssetIds, installedRulesById };
};

/**
 * `rule_id`s are wrapped in quoted KQL literals and `escapeQuotes` handles the
 * only two characters that could break out of the literal (`"` and `\`).
 * Other KQL metacharacters (`()`, `*`, `<`, `>`, `and`/`or`/`not`) stay inside
 * the quotes and are treated as raw text.
 */
const findInstalledRulesByRuleIds = async ({
  rulesClient,
  ruleIds,
}: {
  rulesClient: RulesClient;
  ruleIds: string[];
}): Promise<RuleResponse[]> => {
  if (ruleIds.length === 0) return [];

  const filter = `alert.attributes.params.ruleId: (${ruleIds
    .map((id) => `"${escapeQuotes(id)}"`)
    .join(' OR ')})`;

  const { data } = await findRules({
    rulesClient,
    filter,
    page: 1,
    perPage: ruleIds.length,
    fields: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });

  return data.map((rule) => internalRuleToAPIResponse(rule));
};
