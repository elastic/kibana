/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { SortOrder } from '../../model';

export type PrebuiltRuleAssetsSortField = z.infer<typeof PrebuiltRuleAssetsSortField>;
export const PrebuiltRuleAssetsSortField = lazySchema(() =>
  z.enum(['name', 'risk_score', 'severity'])
);

export type PrebuiltRuleAssetsSortItem = z.infer<typeof PrebuiltRuleAssetsSortItem>;
export const PrebuiltRuleAssetsSortItem = lazySchema(() =>
  z.object({
    /**
     * Field to sort by
     */
    field: PrebuiltRuleAssetsSortField,
    /**
     * Sort order
     */
    order: SortOrder,
  })
);

export type PrebuiltRuleAssetsSort = z.infer<typeof PrebuiltRuleAssetsSort>;
export const PrebuiltRuleAssetsSort = lazySchema(() => z.array(PrebuiltRuleAssetsSortItem));
