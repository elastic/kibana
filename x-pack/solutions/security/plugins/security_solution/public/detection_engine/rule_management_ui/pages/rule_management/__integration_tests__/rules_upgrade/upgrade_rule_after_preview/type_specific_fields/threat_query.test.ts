/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "threat_query" field', () => {
  describe.each([
    {
      ruleType: 'threat_match',
      fieldName: 'threat_query',
      humanizedFieldName: 'Indicator index query',
      initial: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.exe',
        language: 'kuery',
        filters: [],
      },
      customized: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.sys',
        language: 'kuery',
        filters: [],
      },
      upgrade: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.com',
        language: 'kuery',
        filters: [],
      },
      resolvedValue: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.sys',
        language: 'kuery',
        filters: [],
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
