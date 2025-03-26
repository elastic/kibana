/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "risk_score_mapping" field', () => {
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

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'risk_score_mapping',
      humanizedFieldName: 'Risk score override',
      initial: [
        {
          field: 'fieldA',
          operator: 'equals',
          value: '10',
          risk_score: 10,
        },
      ],
      customized: [
        {
          field: 'fieldB',
          operator: 'equals',
          value: '30',
          risk_score: 30,
        },
      ],
      upgrade: [
        {
          field: 'fieldC',
          operator: 'equals',
          value: '50',
          risk_score: 50,
        },
      ],
      resolvedValue: [
        {
          field: 'resolvedNumberField',
          operator: 'equals',
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
