/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesCustomizationStatus } from '../../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { PrebuiltRulesCustomizationDisabledReason } from '../../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { createPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { applyRuleDefaults } from '../apply_rule_defaults';
import { calculateRuleSource } from './calculate_rule_source';

const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient();

const getSampleRuleAsset = () => {
  return applyRuleDefaults({
    rule_id: 'test-rule-id',
    name: 'Test rule',
    description: 'Test description',
    type: 'query',
    query: 'user.name: root or user.name: admin',
    severity: 'high',
    risk_score: 55,
  });
};

const getSampleRule = () => {
  return {
    ...getSampleRuleAsset(),
    id: 'test-rule-id',
    updated_at: '2021-01-01T00:00:00Z',
    updated_by: 'test-user',
    created_at: '2021-01-01T00:00:00Z',
    created_by: 'test-user',
    revision: 1,
  };
};

const ruleCustomizationStatus: PrebuiltRulesCustomizationStatus = {
  isRulesCustomizationEnabled: true,
};

describe('calculateRuleSource', () => {
  it('returns an internal rule source when the rule is not prebuilt', async () => {
    const rule = getSampleRule();
    rule.immutable = false;

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus,
    });
    expect(result).toEqual({
      type: 'internal',
    });
  });

  it('returns an external rule source with customized false when the rule is prebuilt', async () => {
    const rule = getSampleRule();
    rule.immutable = true;

    const baseRule = getSampleRuleAsset();
    prebuiltRuleAssetClient.fetchAssetsByVersion.mockResolvedValueOnce([baseRule]);

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus,
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: 'external',
        is_customized: false,
      })
    );
  });

  it('returns is_customized true when the rule is prebuilt and has been customized', async () => {
    const rule = getSampleRule();
    rule.immutable = true;
    rule.name = 'Updated name';

    const baseRule = getSampleRuleAsset();
    prebuiltRuleAssetClient.fetchAssetsByVersion.mockResolvedValueOnce([baseRule]);

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus,
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: 'external',
        is_customized: true,
      })
    );
  });

  it('returns is_customized false when the rule has only changes to revision, updated_at, updated_by', async () => {
    const rule = getSampleRule();
    rule.immutable = true;
    rule.revision = 5;
    rule.updated_at = '2024-01-01T00:00:00Z';
    rule.updated_by = 'new-user';

    const baseRule = getSampleRuleAsset();
    prebuiltRuleAssetClient.fetchAssetsByVersion.mockResolvedValueOnce([baseRule]);

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus,
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: 'external',
        is_customized: false,
      })
    );
  });

  it('returns is_customized false when the rule is customized but customization feature flag is disabled', async () => {
    const rule = getSampleRule();
    rule.immutable = true;
    rule.name = 'Updated name';

    const baseRule = getSampleRuleAsset();
    prebuiltRuleAssetClient.fetchAssetsByVersion.mockResolvedValueOnce([baseRule]);

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus: {
        isRulesCustomizationEnabled: false,
        customizationDisabledReason: PrebuiltRulesCustomizationDisabledReason.FeatureFlag,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: 'external',
        is_customized: false,
      })
    );
  });

  it('returns is_customized true when the rule is customized and customization is disabled because of license', async () => {
    const rule = getSampleRule();
    rule.immutable = true;
    rule.name = 'Updated name';

    const baseRule = getSampleRuleAsset();
    prebuiltRuleAssetClient.fetchAssetsByVersion.mockResolvedValueOnce([baseRule]);

    const result = await calculateRuleSource({
      prebuiltRuleAssetClient,
      rule,
      ruleCustomizationStatus: {
        isRulesCustomizationEnabled: false,
        customizationDisabledReason: PrebuiltRulesCustomizationDisabledReason.License,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: 'external',
        is_customized: true,
      })
    );
  });
});
