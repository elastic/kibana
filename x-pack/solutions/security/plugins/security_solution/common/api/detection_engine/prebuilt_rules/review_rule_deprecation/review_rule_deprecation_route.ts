/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Max number of deprecated rules returned per request. Conservative limit
 * to protect against unexpected package size.
 */
export const MAX_DEPRECATED_RULES_TO_RETURN = 200;

export type ReviewRuleDeprecationRequestBody = z.infer<typeof ReviewRuleDeprecationRequestBody>;
export const ReviewRuleDeprecationRequestBody = z
  .object({
    /**
     * Optional list of saved-object IDs to filter by.
     * Uses SO IDs instead of rule_ids to avoid ambiguity from duplicate rule_ids.
     */
    ids: z.array(z.string()).optional(),
  })
  .nullable();

export interface DeprecatedRuleForReview {
  /** Installed rule saved object ID */
  id: string;
  /** Rule signature ID */
  rule_id: string;
  /** Installed rule name */
  name: string;
  deprecated_reason?: string;
}

export interface ReviewRuleDeprecationResponseBody {
  rules: DeprecatedRuleForReview[];
}
