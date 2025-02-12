/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { getPrebuiltRuleMock } from '../../../prebuilt_rules/mocks';
import { calculateRuleSourceForImport } from './calculate_rule_source_for_import';

const ruleCustomizationStatus: PrebuiltRulesCustomizationStatus = {
  isRulesCustomizationEnabled: true,
};

describe('calculateRuleSourceForImport', () => {
  it('calculates as internal if no asset is found', () => {
    const result = calculateRuleSourceForImport({
      rule: getRulesSchemaMock(),
      prebuiltRuleAssetsByRuleId: {},
      isKnownPrebuiltRule: false,
      ruleCustomizationStatus,
    });

    expect(result).toEqual({
      ruleSource: {
        type: 'internal',
      },
      immutable: false,
    });
  });

  it('calculates as modified external type if an asset is found without a matching version', () => {
    const rule = getRulesSchemaMock();
    rule.rule_id = 'rule_id';

    const result = calculateRuleSourceForImport({
      rule,
      prebuiltRuleAssetsByRuleId: {},
      isKnownPrebuiltRule: true,
      ruleCustomizationStatus,
    });

    expect(result).toEqual({
      ruleSource: {
        type: 'external',
        is_customized: true,
      },
      immutable: true,
    });
  });

  it('calculates as external with customizations if a matching asset/version is found', () => {
    const rule = getRulesSchemaMock();
    rule.rule_id = 'rule_id';
    const prebuiltRuleAssetsByRuleId = { rule_id: getPrebuiltRuleMock({ rule_id: 'rule_id' }) };

    const result = calculateRuleSourceForImport({
      rule,
      prebuiltRuleAssetsByRuleId,
      isKnownPrebuiltRule: true,
      ruleCustomizationStatus,
    });

    expect(result).toEqual({
      ruleSource: {
        type: 'external',
        is_customized: true,
      },
      immutable: true,
    });
  });

  it('calculates as external without customizations if an exact match is found', () => {
    const rule = getRulesSchemaMock();
    rule.rule_id = 'rule_id';
    const prebuiltRuleAssetsByRuleId = { rule_id: getPrebuiltRuleMock(rule) };

    const result = calculateRuleSourceForImport({
      rule,
      prebuiltRuleAssetsByRuleId,
      isKnownPrebuiltRule: true,
      ruleCustomizationStatus,
    });

    expect(result).toEqual({
      ruleSource: {
        type: 'external',
        is_customized: false,
      },
      immutable: true,
    });
  });
});
