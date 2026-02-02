/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../../test_utils/assert_rule_upgrade_after_review';
import { assertDiffAfterSavingUnchangedValue } from '../../../test_utils/assert_diff_after_saving_unchanged_value';

describe('Upgrade diffable rule "building_block" (query rule type) after preview in flyout', () => {
  const ruleType = 'query';
  const fieldName = 'building_block';
  const humanizedFieldName = 'Building Block';
  const initial = undefined;
  const customized = { type: 'default' };
  const upgrade = { type: 'default' };
  const resolvedValue = undefined;

  assertRuleUpgradePreview({
    ruleType,
    fieldName,
    humanizedFieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });

  assertDiffAfterSavingUnchangedValue({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      upgrade,
    },
  });

  assertRuleUpgradeAfterReview({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });
});
