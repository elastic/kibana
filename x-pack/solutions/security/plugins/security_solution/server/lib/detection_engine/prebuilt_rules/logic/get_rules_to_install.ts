/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAlertType } from '../../rule_schema';
import type { PrebuiltRuleAsset } from '../model/rule_assets/prebuilt_rule_asset';

export const getRulesToInstall = (
  latestPrebuiltRules: PrebuiltRuleAsset[],
  installedRules: Map<string, RuleAlertType>
) => {
  return latestPrebuiltRules.filter((rule) => !installedRules.has(rule.rule_id));
};
