/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "timestamp_override" (query rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockAvailableDataViews([], {
      resolvedDate: {
        name: 'resolvedDateField',
        type: 'date',
        searchable: true,
        aggregatable: true,
      },
    });
  });

  const ruleType = 'query';
  const fieldName = 'timestamp_override';
  const humanizedFieldName = 'Timestamp override';
  const initial = { field_name: 'fieldA', fallback_disabled: false };
  const customized = { field_name: 'fieldB', fallback_disabled: false };
  const upgrade = { field_name: 'fieldC', fallback_disabled: false };
  const resolvedValue = { field_name: 'resolvedDateField', fallback_disabled: false };

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
