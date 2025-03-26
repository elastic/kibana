/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "threat" field', () => {
  describe.each([
    {
      ruleType: 'query',
      fieldName: 'threat',
      humanizedFieldName: 'MITRE ATT&CK\u2122',
      initial: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticA',
            id: 'tacticA',
            reference: 'reference',
          },
        },
      ],
      customized: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticB',
            id: 'tacticB',
            reference: 'reference',
          },
        },
      ],
      upgrade: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticC',
            id: 'tacticC',
            reference: 'reference',
          },
        },
      ],
      resolvedValue: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'Credential Access',
            id: 'TA0006',
            reference: 'https://attack.mitre.org/tactics/TA0006/',
          },
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
