/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { RuleVersions } from '../../prebuilt_rules/logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';

export const getPrebuiltRulesAssets = ({
  savedObjectsClient,
  rulesClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
}): Promise<Map<string, RuleVersions>> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
  return fetchRuleVersionsTriad({ ruleAssetsClient, ruleObjectsClient });
};
