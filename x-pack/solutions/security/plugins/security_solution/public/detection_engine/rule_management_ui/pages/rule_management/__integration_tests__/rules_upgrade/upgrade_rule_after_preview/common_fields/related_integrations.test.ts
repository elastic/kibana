/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRelatedIntegrations } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "related_integrations" (query rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockRelatedIntegrations([
      {
        package: 'packageResolved',
        version: '5.0.0',
      },
    ]);
  });

  const ruleType = 'query';
  const fieldName = 'related_integrations';
  const humanizedFieldName = 'Related Integrations';
  const initial = [
    {
      package: 'packageA',
      version: '^1.0.0',
    },
  ];
  const customized = [
    {
      package: 'packageB',
      version: '^1.0.0',
    },
  ];
  const upgrade = [
    {
      package: 'packageC',
      version: '^1.0.0',
    },
  ];
  const resolvedValue = [
    {
      package: 'packageResolved',
      version: '^9.0.0',
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
