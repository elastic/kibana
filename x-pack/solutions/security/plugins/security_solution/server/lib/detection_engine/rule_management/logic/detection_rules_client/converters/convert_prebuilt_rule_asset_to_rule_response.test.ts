/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertPrebuiltRuleAssetToRuleResponse } from './convert_prebuilt_rule_asset_to_rule_response';
import { getPrebuiltRuleMock } from '../../../../prebuilt_rules/mocks';

describe('convertPrebuiltRuleAssetToRuleResponse', () => {
  it('converts a valid prebuilt asset (without a language field) to valid rule response (with a language field)', () => {
    const ruleAssetWithoutLanguage = getPrebuiltRuleMock({ language: undefined });

    expect(convertPrebuiltRuleAssetToRuleResponse(ruleAssetWithoutLanguage)).toMatchObject({
      language: 'kuery',
    });
  });
});
