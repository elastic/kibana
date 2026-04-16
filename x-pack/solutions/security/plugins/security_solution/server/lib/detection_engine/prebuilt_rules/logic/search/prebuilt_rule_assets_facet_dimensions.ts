/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAssetsFacetCategory } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_aggregations';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../rule_assets/prebuilt_rule_assets_type';

/**
 * Maps user-friendly facet category names to their corresponding attribute
 * path on the prebuilt rule asset saved object. Only attributes that exist on
 * uninstalled rule assets are supported.
 */
export const PREBUILT_RULE_ASSETS_FACET_CATEGORY_TO_ATTRIBUTE: Record<
  PrebuiltRuleAssetsFacetCategory,
  string
> = {
  tags: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.tags`,
  type: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.type`,
};
