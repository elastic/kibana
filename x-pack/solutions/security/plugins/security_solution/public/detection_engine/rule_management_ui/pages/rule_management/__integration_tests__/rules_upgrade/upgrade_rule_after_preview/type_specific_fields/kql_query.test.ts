/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "kql_query" field', () => {
  describe.each([
    {
      ruleType: 'query',
      fieldName: 'kql_query',
      humanizedFieldName: 'KQL query',
      initial: {
        query: '*:*',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
      customized: {
        query: '*:*',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
      upgrade: {
        query: 'process.name:*.sys',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
      resolvedValue: {
        query: '*:resolved',
        language: 'kuery',
        type: KqlQueryType.inline_query,
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
