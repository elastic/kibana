/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../../test_utils/assert_rule_upgrade_after_review';
import { assertDiffAfterSavingUnchangedValue } from '../../../test_utils/assert_diff_after_saving_unchanged_value';
import { assertFieldValidation } from '../../../test_utils/assert_field_validation';

describe('Upgrade diffable rule "anomaly_threshold" (machine_learning rule type) after preview in flyout', () => {
  const ruleType = 'machine_learning';
  const fieldName = 'anomaly_threshold';
  const humanizedFieldName = 'Anomaly score threshold';
  const initial = 10;
  const customized = 20;
  const upgrade = 30;
  const resolvedValue = 40;

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

  assertFieldValidation({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      upgrade,
      // value higher than 100 is invalid
      invalidValue: 101,
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
