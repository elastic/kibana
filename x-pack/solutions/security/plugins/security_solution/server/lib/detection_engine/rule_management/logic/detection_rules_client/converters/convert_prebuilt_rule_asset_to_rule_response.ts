/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';

export const convertPrebuiltRuleAssetToRuleResponse = (
  prebuiltRuleAsset: PrebuiltRuleAsset
): RuleResponse => {
  const immutable = true;

  const ruleResponseSpecificFields = {
    id: uuidv4(),
    updated_at: new Date().toISOString(),
    updated_by: '',
    created_at: new Date().toISOString(),
    created_by: '',
    immutable,
    rule_source: {
      type: 'external',
      is_customized: false,
    },
    revision: 1,
  };

  const ruleWithDefaults = applyRuleDefaults(prebuiltRuleAsset);

  return RuleResponse.parse({
    ...ruleWithDefaults,
    ...ruleResponseSpecificFields,
  });
};
