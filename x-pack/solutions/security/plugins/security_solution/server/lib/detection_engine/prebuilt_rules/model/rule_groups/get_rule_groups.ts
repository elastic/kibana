/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../rule_assets/prebuilt_rule_asset';

export interface RuleTriad {
  /**
   * The base version of the rule (no customizations)
   */
  base?: PrebuiltRuleAsset;
  /**
   * The currently installed version
   */
  current: RuleResponse;
  /**
   * The latest available version
   */
  target: PrebuiltRuleAsset;
}
