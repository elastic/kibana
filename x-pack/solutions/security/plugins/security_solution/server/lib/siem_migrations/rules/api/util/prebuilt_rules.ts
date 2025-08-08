/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { createPrebuiltRuleObjectsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleAssetsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../../detection_engine/rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { SiemRuleMigrationsClient } from '../../siem_rule_migrations_service';

export const getUniquePrebuiltRuleIds = (migrationRules: RuleMigrationRule[]): string[] => {
  const rulesIds = new Set<string>();
  migrationRules.forEach((rule) => {
    if (rule.elastic_rule?.prebuilt_rule_id) {
      rulesIds.add(rule.elastic_rule.prebuilt_rule_id);
    }
  });
  return Array.from(rulesIds);
};

export interface PrebuiltRulesResults {
  /**
   * The latest available version
   */
  target: RuleResponse;

  /**
   * The currently installed version
   */
  current?: RuleResponse;
}

/**
 * Gets Elastic prebuilt rules
 * @param rulesClient The rules client to fetch prebuilt rules
 * @param savedObjectsClient The saved objects client
 * @param rulesIds The list of IDs to filter requested prebuilt rules. If not specified, all available prebuilt rules will be returned.
 * @returns
 */
export const getPrebuiltRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rulesIds?: string[]
): Promise<Record<string, PrebuiltRulesResults>> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

  const prebuiltRulesMap = await fetchRuleVersionsTriad({
    ruleAssetsClient,
    ruleObjectsClient,
  });

  // Filter out prebuilt rules by `rule_id`
  let filteredPrebuiltRulesMap: typeof prebuiltRulesMap;
  if (rulesIds) {
    filteredPrebuiltRulesMap = new Map();
    for (const ruleId of rulesIds) {
      const prebuiltRule = prebuiltRulesMap.get(ruleId);
      if (prebuiltRule) {
        filteredPrebuiltRulesMap.set(ruleId, prebuiltRule);
      }
    }
  } else {
    filteredPrebuiltRulesMap = prebuiltRulesMap;
  }

  const prebuiltRules: Record<string, PrebuiltRulesResults> = {};
  filteredPrebuiltRulesMap.forEach((ruleVersions, ruleId) => {
    if (ruleVersions.target) {
      prebuiltRules[ruleId] = {
        target: convertPrebuiltRuleAssetToRuleResponse(ruleVersions.target),
        current: ruleVersions.current,
      };
    }
  });

  return prebuiltRules;
};

/**
 * Gets Elastic prebuilt rules
 * @param migrationId The `id` of the migration to get related prebuilt rules for
 * @param ruleMigrationsClient The rules migration client to migration rules data
 * @param rulesClient The rules client to fetch prebuilt rules
 * @param savedObjectsClient The saved objects client
 * @returns
 */
export const getPrebuiltRulesForMigration = async (
  migrationId: string,
  ruleMigrationsClient: SiemRuleMigrationsClient,
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract
): Promise<Record<string, PrebuiltRulesResults>> => {
  const options = { filters: { prebuilt: true } };
  const batches = ruleMigrationsClient.data.rules.searchBatches(migrationId, options);

  const rulesIds = new Set<string>();
  let results = await batches.next();
  while (results.length) {
    results.forEach((rule) => {
      if (rule.elastic_rule?.prebuilt_rule_id) {
        rulesIds.add(rule.elastic_rule.prebuilt_rule_id);
      }
    });
    results = await batches.next();
  }
  const prebuiltRulesIds = Array.from(rulesIds);

  const prebuiltRules = await getPrebuiltRules(rulesClient, savedObjectsClient, prebuiltRulesIds);

  return prebuiltRules;
};
