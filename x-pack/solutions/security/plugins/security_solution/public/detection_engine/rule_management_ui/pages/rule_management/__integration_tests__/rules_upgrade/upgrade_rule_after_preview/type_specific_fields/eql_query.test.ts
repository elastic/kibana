/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { KibanaServices } from '../../../../../../../../common/lib/kibana';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "eql_query" (eql rule type) after preview in flyout', () => {
  beforeAll(() => {
    // Mock EQL validation response. It shouldn't contain "errors" field for a valid EQL query.
    (KibanaServices.get().data.search.search as jest.Mock).mockReturnValue(of({}));
  });

  const ruleType = 'eql';
  const fieldName = 'eql_query';
  const humanizedFieldName = 'EQL query';
  const initial = {
    query: 'any where true',
    language: 'eql',
    filters: [],
  };
  const customized = {
    query: 'host where host.name == "something"',
    language: 'eql',
    filters: [],
  };
  const upgrade = {
    query: 'process where process.name == "regsvr32.exe"',
    language: 'eql',
    filters: [],
  };
  const resolvedValue = {
    query: 'process where event.name == "resolved"',
    language: 'eql',
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
