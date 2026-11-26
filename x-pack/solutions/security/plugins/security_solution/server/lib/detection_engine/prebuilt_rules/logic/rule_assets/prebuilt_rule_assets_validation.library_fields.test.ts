/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrebuiltRuleMock } from '../../mocks';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAsset } from './prebuilt_rule_assets_validation';

describe('validatePrebuiltRuleAsset library fields', () => {
  const rule = (fields: Record<string, string>): PrebuiltRuleAsset =>
    ({ ...getPrebuiltRuleMock(), ...fields } as PrebuiltRuleAsset);

  it('keeps where the rule came from, which the asset schema itself does not know', () => {
    const validated = validatePrebuiltRuleAsset(
      rule({
        library_id: 'custom',
        library_title: 'Elastic Community Rules',
        library_path: 'rules/linux/a.yml',
      })
    );

    expect(validated).toEqual(
      expect.objectContaining({
        library_id: 'custom',
        library_title: 'Elastic Community Rules',
        library_path: 'rules/linux/a.yml',
      })
    );
  });

  it('adds nothing for a rule that has no library fields', () => {
    const validated = validatePrebuiltRuleAsset(rule({}));

    expect(validated).not.toHaveProperty('library_id');
    expect(validated).not.toHaveProperty('library_title');
    expect(validated).not.toHaveProperty('library_path');
  });
});
