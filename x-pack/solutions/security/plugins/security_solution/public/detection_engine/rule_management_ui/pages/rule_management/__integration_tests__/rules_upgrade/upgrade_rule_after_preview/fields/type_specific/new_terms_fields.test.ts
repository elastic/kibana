/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../../test_utils/assert_rule_upgrade_after_review';
import { assertDiffAfterSavingUnchangedValue } from '../../../test_utils/assert_diff_after_saving_unchanged_value';

describe('Upgrade diffable rule "new_terms_fields" (new_terms rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockAvailableDataViews([], {
      resolved: {
        name: 'resolved',
        type: 'string',
        searchable: true,
        aggregatable: true,
      },
    });
  });

  const ruleType = 'new_terms';
  const fieldName = 'new_terms_fields';
  const humanizedFieldName = 'New Terms Fields';
  const initial = ['fieldA'];
  const customized = ['fieldB'];
  const upgrade = ['fieldA', 'fieldC'];
  const resolvedValue = ['resolved'];

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
