/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "rule_schedule" field', () => {
  describe.each([
    {
      ruleType: 'query',
      fieldName: 'rule_schedule',
      humanizedFieldName: 'Rule Schedule',
      initial: {
        interval: '5m',
        from: 'now-10m',
        to: 'now',
      },
      customized: {
        interval: '10m',
        from: 'now-1h',
        to: 'now',
      },
      upgrade: {
        interval: '15m',
        from: 'now-20m',
        to: 'now',
      },
      resolvedValue: {
        interval: '1h',
        from: 'now-2h',
        to: 'now',
      },
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
