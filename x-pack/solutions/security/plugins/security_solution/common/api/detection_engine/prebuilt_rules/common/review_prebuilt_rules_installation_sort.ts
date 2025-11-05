/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SortOrder } from '../../model';

export type ReviewPrebuiltRuleInstallationSortField = z.infer<
  typeof ReviewPrebuiltRuleInstallationSortField
>;
export const ReviewPrebuiltRuleInstallationSortField = z.enum(['name', 'risk_score', 'severity']);

export type ReviewPrebuiltRuleInstallationSort = z.infer<typeof ReviewPrebuiltRuleInstallationSort>;
export const ReviewPrebuiltRuleInstallationSort = z.array(
  z.object({
    /**
     * Field to sort by
     */
    field: ReviewPrebuiltRuleInstallationSortField,
    /**
     * Sort order
     */
    order: SortOrder,
  })
);
