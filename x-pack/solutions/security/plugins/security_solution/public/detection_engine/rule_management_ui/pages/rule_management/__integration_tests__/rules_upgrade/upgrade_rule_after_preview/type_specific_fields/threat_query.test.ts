/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "threat_query" (threat_match rule type) after preview in flyout', () => {
  const ruleType = 'threat_match';
  const fieldName = 'threat_query';
  const humanizedFieldName = 'Indicator index query';
  const initial = {
    type: KqlQueryType.inline_query,
    query: 'process.name:*.exe',
    language: 'kuery',
    filters: [],
  };
  const customized = {
    type: KqlQueryType.inline_query,
    query: 'process.name:*.sys',
    language: 'kuery',
    filters: [],
  };
  const upgrade = {
    type: KqlQueryType.inline_query,
    query: 'process.name:*.com',
    language: 'kuery',
    filters: [],
  };
  const resolvedValue = {
    type: KqlQueryType.inline_query,
    query: 'process.name:*.sys',
    language: 'kuery',
    filters: [],
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
