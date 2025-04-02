/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAvailableDataViews } from '../../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "timestamp_override" field', () => {
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

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'timestamp_override',
      humanizedFieldName: 'Timestamp override',
      initial: { field_name: 'fieldA', fallback_disabled: false },
      customized: { field_name: 'fieldB', fallback_disabled: false },
      upgrade: { field_name: 'fieldC', fallback_disabled: false },
      resolvedValue: { field_name: 'resolvedDateField', fallback_disabled: false },
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
