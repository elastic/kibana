/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';
import { mockAvailableDataViews } from '../../mock/rule_upgrade_flyout';

describe('Upgrade rule after preview - "new_terms_fields" field', () => {
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

  describe.each([
    {
      ruleType: 'new_terms',
      fieldName: 'new_terms_fields',
      humanizedFieldName: 'New Terms Fields',
      initial: ['fieldA'],
      customized: ['fieldB'],
      upgrade: ['fieldA', 'fieldC'],
      resolvedValue: ['resolved'],
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
