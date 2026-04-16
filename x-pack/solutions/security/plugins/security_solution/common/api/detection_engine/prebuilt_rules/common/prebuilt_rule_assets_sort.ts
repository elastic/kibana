/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SortOrder } from '../../model';

export type PrebuiltRuleAssetsSortField = z.infer<typeof PrebuiltRuleAssetsSortField>;
export const PrebuiltRuleAssetsSortField = z.enum(['name', 'risk_score', 'severity']);

/**
 * UI-only convenience type that pairs a {@link PrebuiltRuleAssetsSortField}
 * with a {@link SortOrder}. The wire format uses separate `sort_field` and
 * `sort_order` properties (see `ReviewRuleInstallationRequestBody`).
 */
export type PrebuiltRuleAssetsSortItem = z.infer<typeof PrebuiltRuleAssetsSortItem>;
export const PrebuiltRuleAssetsSortItem = z.object({
  /**
   * Field to sort by
   */
  field: PrebuiltRuleAssetsSortField,
  /**
   * Sort order
   */
  order: SortOrder,
});
