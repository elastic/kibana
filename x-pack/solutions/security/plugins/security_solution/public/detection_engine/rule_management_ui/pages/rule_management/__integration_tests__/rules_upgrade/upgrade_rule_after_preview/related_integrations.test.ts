/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRelatedIntegrations } from '../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "related_integrations" field', () => {
  beforeAll(() => {
    mockRelatedIntegrations([
      {
        package: 'packageResolved',
        version: '5.0.0',
      },
    ]);
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'related_integrations',
      humanizedFieldName: 'Related Integrations',
      initial: [
        {
          package: 'packageA',
          version: '^1.0.0',
        },
      ],
      customized: [
        {
          package: 'packageB',
          version: '^1.0.0',
        },
      ],
      upgrade: [
        {
          package: 'packageC',
          version: '^1.0.0',
        },
      ],
      resolvedValue: [
        {
          package: 'packageResolved',
          version: '^9.0.0',
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
