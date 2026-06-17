/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleUpgradeSpecifier } from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { MlAuthz } from '../../../machine_learning/authz';
import type { RuleAlertType } from '../../rule_schema';
import type { BasicRuleInfo } from './basic_rule_info';
import type { RuleSummary } from './rule_objects/prebuilt_rule_objects_client';

/**
 * Converts an array of rules to a Map with rule IDs as keys
 *
 * @param rules Array of rules
 * @returns Map
 */
export const rulesToMap = (rules: RuleAlertType[]) =>
  new Map(rules.map((rule) => [rule.params.ruleId, rule]));

/**
 * Excludes rules that are not allowed under the current license.
 *
 * @param rules The array of rule objects to filter
 * @param mlAuthz Machine Learning authorization object
 * @returns A new array containing only the rules that are allowed under the current license
 */
export async function excludeLicenseRestrictedRules<T extends { type: Type }>(
  rules: T[],
  mlAuthz: MlAuthz
): Promise<T[]> {
  const validationResults = await Promise.all(
    rules.map((rule) => mlAuthz.validateRuleType(rule.type))
  );

  return rules.filter((_rule, index) => validationResults[index].valid);
}

function getUpgradeTargets(
  currentRules: RuleSummary[],
  targetRulesMap: Map<string, BasicRuleInfo>
): RuleSummary[] {
  return currentRules.filter((currentRule) => {
    const targetRule = targetRulesMap.get(currentRule.rule_id);
    return targetRule !== undefined && currentRule.version < targetRule.version;
  });
}

/**
 * Given current and target rules, returns upgrade specifiers for rules that have a newer version
 * available and are allowed under the current license.
 *
 * @param currentRules The list of rules currently installed.
 * @param targetRulesMap A map of the latest available rule versions, with rule_id as the key.
 * @param mlAuthz Machine Learning authorization object
 * @returns An array of upgrade specifiers with the target version and current revision.
 */
export async function getPossibleUpgrades(
  currentRules: RuleSummary[],
  targetRulesMap: Map<string, BasicRuleInfo>,
  mlAuthz: MlAuthz
): Promise<RuleUpgradeSpecifier[]> {
  const upgradeTargets = getUpgradeTargets(currentRules, targetRulesMap);
  const targetInfos = upgradeTargets
    .map((r) => targetRulesMap.get(r.rule_id))
    .filter(Boolean) as BasicRuleInfo[];
  const allowedTargetInfos = await excludeLicenseRestrictedRules(targetInfos, mlAuthz);
  const allowedIds = new Set(allowedTargetInfos.map((t) => t.rule_id));

  return upgradeTargets
    .filter((r) => allowedIds.has(r.rule_id) && Boolean(targetRulesMap.get(r.rule_id)))
    .map((r) => ({
      rule_id: r.rule_id,
      revision: r.revision,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      version: targetRulesMap.get(r.rule_id)!.version,
    }));
}
