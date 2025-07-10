/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "severity_mapping" (query rule type) after preview in flyout', () => {
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
  const fieldName = 'severity_mapping';
  const humanizedFieldName = 'Severity override';
  const initial = [
    {
      field: 'fieldA',
      operator: 'equals',
      severity: 'low',
      value: '10',
    },
  ];
  const customized = [
    {
      field: 'fieldB',
      operator: 'equals',
      severity: 'medium',
      value: '30',
    },
  ];
  const upgrade = [
    {
      field: 'fieldC',
      operator: 'equals',
      severity: 'high',
      value: '50',
    },
  ];
  const resolvedValue = [
    {
      field: 'resolvedStringField',
      value: '70',
      operator: 'equals',
      severity: 'critical',
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
