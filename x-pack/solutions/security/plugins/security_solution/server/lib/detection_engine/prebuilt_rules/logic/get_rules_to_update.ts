/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAlertType } from '../../rule_schema';
import type { PrebuiltRuleAsset } from '../model/rule_assets/prebuilt_rule_asset';

/**
 * Returns the rules to update by doing a compare to the rules from the file system against
 * the installed rules already. This also merges exception list items between the two since
 * exception list items can exist on both rules to update and already installed rules.
 * @param latestPrebuiltRules The latest rules to check against installed
 * @param installedRules The installed rules
 */
export const getRulesToUpdate = (
  latestPrebuiltRules: PrebuiltRuleAsset[],
  installedRules: Map<string, RuleAlertType>
) => {
  return latestPrebuiltRules.filter((latestRule) =>
    filterInstalledRules(latestRule, installedRules)
  );
};

/**
 * Filters latest prepackaged rules that do not match the installed rules so you
 * only get back rules that are going to be updated
 * @param latestPrebuiltRule The latest prepackaged rule version
 * @param installedRules The installed rules to compare against for updates
 */
export const filterInstalledRules = (
  latestPrebuiltRule: PrebuiltRuleAsset,
  installedRules: Map<string, RuleAlertType>
): boolean => {
  const installedRule = installedRules.get(latestPrebuiltRule.rule_id);

  return !!installedRule && installedRule.params.version < latestPrebuiltRule.version;
};
