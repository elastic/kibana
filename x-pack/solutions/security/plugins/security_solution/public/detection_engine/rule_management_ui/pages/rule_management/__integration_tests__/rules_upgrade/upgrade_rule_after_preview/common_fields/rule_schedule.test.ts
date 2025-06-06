/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "rule_schedule" (query rule type) after preview in flyout', () => {
  const ruleType = 'query';
  const fieldName = 'rule_schedule';
  const humanizedFieldName = 'Rule Schedule';
  const initial = {
    interval: '5m',
    from: 'now-10m',
    to: 'now',
  };
  const customized = {
    interval: '10m',
    from: 'now-1h',
    to: 'now',
  };
  const upgrade = {
    interval: '15m',
    from: 'now-20m',
    to: 'now',
  };
  const resolvedValue = {
    interval: '1h',
    from: 'now-2h',
    to: 'now',
  };

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
