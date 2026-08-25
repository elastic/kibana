/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MlAuthz } from '../../../machine_learning/authz';
import type { RuleAlertType } from '../../rule_schema';
import type { RuleVersionSpecifier } from './rule_versions/rule_version_specifier';
import type { BasicRuleInfo } from './basic_rule_info';

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
  currentRules: RuleVersionSpecifier[],
  targetRulesMap: Map<string, BasicRuleInfo>
): BasicRuleInfo[] {
  return currentRules.reduce<BasicRuleInfo[]>((allUpgradableRules, currentRule) => {
    const targetRule = targetRulesMap.get(currentRule.rule_id);
    if (targetRule && currentRule.version < targetRule.version) {
      allUpgradableRules.push(targetRule);
    }
    return allUpgradableRules;
  }, []);
}

/**
 * Given current and a target rules, returns a list of possible upgrade targets.
 *
 * @param currentRules The list of rules currently installed.
 * @param targetRulesMap A map of the latest available rule versions, with rule_id as the key.
 * @param mlAuthz Machine Learning authorization object
 * @returns An array of target rule version specifiers.
 */
export function getPossibleUpgrades(
  currentRules: RuleVersionSpecifier[],
  targetRulesMap: Map<string, BasicRuleInfo>,
  mlAuthz: MlAuthz
): Promise<RuleVersionSpecifier[]> {
  const upgradeTargets = getUpgradeTargets(currentRules, targetRulesMap);
  return excludeLicenseRestrictedRules(upgradeTargets, mlAuthz);
}
