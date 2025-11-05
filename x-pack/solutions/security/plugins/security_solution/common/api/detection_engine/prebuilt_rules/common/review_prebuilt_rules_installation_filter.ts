/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type ReviewPrebuiltRuleInstallationFilter = z.infer<
  typeof ReviewPrebuiltRuleInstallationFilter
>;
export const ReviewPrebuiltRuleInstallationFilter = z.object({
  /**
   * Tags to filter by
   */
  tags: z.array(z.string()).optional(),
  /**
   * Rule name to filter by
   */
  name: z.string().optional(),
});
