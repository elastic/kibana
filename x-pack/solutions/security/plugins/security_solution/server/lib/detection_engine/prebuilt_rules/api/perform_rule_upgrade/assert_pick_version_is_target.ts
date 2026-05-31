/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PickVersionValues,
  RuleUpgradeSpecifier,
} from '../../../../../../common/api/detection_engine';

interface AssertPickVersionIsTargetProps {
  ruleId: string;
  globalPickVersion?: PickVersionValues;
  ruleUpgradeSpecifier?: RuleUpgradeSpecifier;
}

/*
 * Assert that, in the case where the rule is undergoing a rule type change,
 * the pick_version value is set to 'TARGET' at all levels (global, rule-specific and field-specific)
 */
export const assertPickVersionIsTarget = ({
  ruleId,
  globalPickVersion,
  ruleUpgradeSpecifier,
}: AssertPickVersionIsTargetProps) => {
  const pickVersions: Array<PickVersionValues | 'RESOLVED'> = [];

  if (ruleUpgradeSpecifier) {
    // SPECIFIC_RULES mode — rule-level pick_version overrides global, fall back to global or 'MERGED'
    pickVersions.push(ruleUpgradeSpecifier.pick_version ?? globalPickVersion ?? 'MERGED');

    if (ruleUpgradeSpecifier.fields) {
      const fieldPickValues = Object.values(ruleUpgradeSpecifier.fields).map(
        (field) => field.pick_version
      );
      pickVersions.push(...fieldPickValues);
    }
  } else {
    // ALL_RULES mode
    pickVersions.push(globalPickVersion ?? 'MERGED');
  }

  const allPickVersionsAreTarget = pickVersions.every((version) => version === 'TARGET');

  if (!allPickVersionsAreTarget) {
    throw new Error(
      `Rule update for rule ${ruleId} has a rule type change. All 'pick_version' values for rule must match 'TARGET'`
    );
  }
};
