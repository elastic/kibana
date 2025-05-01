/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "risk_score_mapping" (query rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockAvailableDataViews([], {
      resolvedNumber: {
        name: 'resolvedNumberField',
        type: 'number',
        searchable: true,
        aggregatable: true,
      },
    });
  });

  const ruleType = 'query';
  const fieldName = 'risk_score_mapping';
  const humanizedFieldName = 'Risk score override';
  const initial = [
    {
      field: 'fieldA',
      operator: 'equals',
      value: '10',
      risk_score: 10,
    },
  ];
  const customized = [
    {
      field: 'fieldB',
      operator: 'equals',
      value: '30',
      risk_score: 30,
    },
  ];
  const upgrade = [
    {
      field: 'fieldC',
      operator: 'equals',
      value: '50',
      risk_score: 50,
    },
  ];
  const resolvedValue = [
    {
      field: 'resolvedNumberField',
      operator: 'equals',
    },
  ];

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
