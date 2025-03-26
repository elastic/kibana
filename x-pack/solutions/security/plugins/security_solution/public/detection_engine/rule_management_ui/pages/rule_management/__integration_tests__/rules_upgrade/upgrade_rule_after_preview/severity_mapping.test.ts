/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "severity_mapping" field', () => {
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

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'severity_mapping',
      humanizedFieldName: 'Severity override',
      initial: [
        {
          field: 'fieldA',
          operator: 'equals',
          severity: 'low',
          value: '10',
        },
      ],
      customized: [
        {
          field: 'fieldB',
          operator: 'equals',
          severity: 'medium',
          value: '30',
        },
      ],
      upgrade: [
        {
          field: 'fieldC',
          operator: 'equals',
          severity: 'high',
          value: '50',
        },
      ],
      resolvedValue: [
        {
          field: 'resolvedStringField',
          value: '70',
          operator: 'equals',
          severity: 'critical',
        },
      ],
    },
  ] as const)(
    '$fieldName ($ruleType rule)',
    ({ ruleType, fieldName, humanizedFieldName, initial, customized, upgrade, resolvedValue }) => {
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
    }
  );
});
