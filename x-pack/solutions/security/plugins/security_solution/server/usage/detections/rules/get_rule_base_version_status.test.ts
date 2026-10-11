/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleBaseVersionStatus } from './get_initial_usage';
import { getRuleBaseVersionStatus } from './get_rule_base_version_status';

describe('getRuleBaseVersionStatus', () => {
  it('returns zeroed counts for an empty list', () => {
    expect(getRuleBaseVersionStatus([])).toEqual(getInitialRuleBaseVersionStatus());
  });

  it('counts rules by customization and base version presence', () => {
    const prebuiltRules = [
      createPrebuiltRule({ is_customized: true, has_base_version: true }),
      createPrebuiltRule({ is_customized: true, has_base_version: true }),
      createPrebuiltRule({ is_customized: true, has_base_version: false }),
      createPrebuiltRule({ is_customized: false, has_base_version: true }),
      createPrebuiltRule({ is_customized: false, has_base_version: true }),
      createPrebuiltRule({ is_customized: false, has_base_version: true }),
      createPrebuiltRule({ is_customized: false, has_base_version: false }),
    ];

    expect(getRuleBaseVersionStatus(prebuiltRules)).toEqual({
      customized_with_base_version: 2,
      customized_without_base_version: 1,
      noncustomized_with_base_version: 3,
      noncustomized_without_base_version: 1,
    });
  });
});

function createPrebuiltRule(rule: { is_customized: boolean; has_base_version: boolean }) {
  return rule;
}
