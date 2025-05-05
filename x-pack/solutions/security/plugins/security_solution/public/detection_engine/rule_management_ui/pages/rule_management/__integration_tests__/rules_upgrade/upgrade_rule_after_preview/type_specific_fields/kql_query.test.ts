/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "kql_query" (query rule type) after preview in flyout', () => {
  const ruleType = 'query';
  const fieldName = 'kql_query';
  const humanizedFieldName = 'KQL query';
  const initial = {
    query: '*:*',
    language: 'kuery',
    type: KqlQueryType.inline_query,
    filters: [],
  };
  const customized = {
    query: '*:*',
    language: 'kuery',
    type: KqlQueryType.inline_query,
    filters: [],
  };
  const upgrade = {
    query: 'process.name:*.sys',
    language: 'kuery',
    type: KqlQueryType.inline_query,
    filters: [],
  };
  const resolvedValue = {
    query: '*:resolved',
    language: 'kuery',
    type: KqlQueryType.inline_query,
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
