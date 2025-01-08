/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withSecuritySpanSync } from '../../../../../utils/with_security_span';
import type {
  RuleResponse,
  RuleUpgradeSpecifier,
  SkippedRuleUpgrade,
} from '../../../../../../common/api/detection_engine';
import { ModeEnum, SkipRuleUpgradeReasonEnum } from '../../../../../../common/api/detection_engine';
import type { PromisePoolError } from '../../../../../utils/promise_pool';
import type { Mode } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

export const getUpgradeableRules = ({
  rawUpgradeableRules,
  currentRules,
  versionSpecifiers,
  mode,
}: {
  rawUpgradeableRules: RuleTriad[];
  currentRules: RuleResponse[];
  versionSpecifiers?: RuleUpgradeSpecifier[];
  mode: Mode;
}) => {
  return withSecuritySpanSync(getUpgradeableRules.name, () => {
    const upgradeableRules = new Map(
      rawUpgradeableRules.map((_rule) => [_rule.current.rule_id, _rule])
    );
    const fetchErrors: Array<PromisePoolError<{ rule_id: string }, Error>> = [];
    const skippedRules: SkippedRuleUpgrade[] = [];

    if (mode === ModeEnum.SPECIFIC_RULES) {
      const installedRuleIds = new Set(currentRules.map((rule) => rule.rule_id));
      const upgradeableRuleIds = new Set(rawUpgradeableRules.map(({ current }) => current.rule_id));
      versionSpecifiers?.forEach((rule) => {
        // Check that the requested rule was found
        if (!installedRuleIds.has(rule.rule_id)) {
          fetchErrors.push({
            error: new Error(
              `Rule with rule_id "${rule.rule_id}" and version "${rule.version}" not found`
            ),
            item: rule,
          });
          return;
        }

        // Check that the requested rule is upgradeable
        if (!upgradeableRuleIds.has(rule.rule_id)) {
          skippedRules.push({
            rule_id: rule.rule_id,
            reason: SkipRuleUpgradeReasonEnum.RULE_UP_TO_DATE,
          });
          return;
        }

        // Check that rule revisions match (no update slipped in since the user reviewed the list)
        const currentRevision = currentRules.find(
          (currentRule) => currentRule.rule_id === rule.rule_id
        )?.revision;
        if (rule.revision !== currentRevision) {
          fetchErrors.push({
            error: new Error(
              `Revision mismatch for rule_id ${rule.rule_id}: expected ${currentRevision}, got ${rule.revision}`
            ),
            item: rule,
          });
          // Remove the rule from the list of upgradeable rules
          if (upgradeableRules.has(rule.rule_id)) {
            upgradeableRules.delete(rule.rule_id);
          }
        }
      });
    }

    return {
      upgradeableRules: Array.from(upgradeableRules.values()),
      fetchErrors,
      skippedRules,
    };
  });
};
