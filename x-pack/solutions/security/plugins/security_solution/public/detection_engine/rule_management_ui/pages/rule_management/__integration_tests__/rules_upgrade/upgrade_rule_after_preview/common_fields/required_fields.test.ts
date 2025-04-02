/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "required_fields" field', () => {
  describe.each([
    {
      ruleType: 'query',
      fieldName: 'required_fields',
      humanizedFieldName: 'Required fields',
      initial: [
        {
          name: 'fieldA',
          type: 'string',
          ecs: false,
        },
      ],
      customized: [
        {
          name: 'fieldB',
          type: 'string',
          ecs: false,
        },
      ],
      upgrade: [
        {
          name: 'fieldC',
          type: 'string',
          ecs: false,
        },
      ],
      resolvedValue: [
        {
          name: 'resolvedStringField',
          type: 'string',
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
