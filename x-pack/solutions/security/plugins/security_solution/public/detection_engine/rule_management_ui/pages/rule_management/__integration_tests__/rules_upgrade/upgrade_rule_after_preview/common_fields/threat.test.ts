/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "threat" (query rule type) after preview in flyout', () => {
  const ruleType = 'query';
  const fieldName = 'threat';
  const humanizedFieldName = 'MITRE ATT&CK\u2122';
  const initial = [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        name: 'tacticA',
        id: 'tacticA',
        reference: 'reference',
      },
    },
  ];
  const customized = [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        name: 'tacticB',
        id: 'tacticB',
        reference: 'reference',
      },
    },
  ];
  const upgrade = [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        name: 'tacticC',
        id: 'tacticC',
        reference: 'reference',
      },
    },
  ];
  const resolvedValue = [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        name: 'Credential Access',
        id: 'TA0006',
        reference: 'https://attack.mitre.org/tactics/TA0006/',
      },
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
