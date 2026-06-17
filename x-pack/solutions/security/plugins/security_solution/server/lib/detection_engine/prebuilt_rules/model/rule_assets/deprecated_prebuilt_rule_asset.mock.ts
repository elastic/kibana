/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecatedPrebuiltRuleAsset } from './deprecated_prebuilt_rule_asset';

export const getDeprecatedPrebuiltRuleMock = (
  rewrites?: Partial<DeprecatedPrebuiltRuleAsset>
): DeprecatedPrebuiltRuleAsset => ({
  rule_id: 'deprecated-rule-1',
  version: 1,
  name: 'Deprecated rule',
  deprecated: true as const,
  ...rewrites,
});
