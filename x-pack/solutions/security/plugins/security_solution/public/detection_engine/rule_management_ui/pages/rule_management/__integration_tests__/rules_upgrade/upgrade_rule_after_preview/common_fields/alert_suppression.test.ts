/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "alert_suppression" (query rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockAvailableDataViews([], {
      resolvedString: {
        name: 'resolvedStringField',
        type: 'string',
        searchable: true,
        aggregatable: true,
      },
    });
  });

  const ruleType = 'query';
  const fieldName = 'alert_suppression';
  const humanizedFieldName = 'Alert suppression';
  const initial = { group_by: ['fieldA'] };
  const customized = { group_by: ['fieldB'] };
  const upgrade = { group_by: ['fieldC'] };
  const resolvedValue = { group_by: ['resolvedStringField'] };

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
