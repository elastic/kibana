/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export type ResolutionRuleOverride = z.infer<typeof ResolutionRuleOverride>;
export const ResolutionRuleOverride = z.object({
  enabled: z.boolean(),
});

export type ResolutionRuleOverrides = z.infer<typeof ResolutionRuleOverrides>;
export const ResolutionRuleOverrides = z.object({
  // Map of ruleId -> override. Only rules that have been explicitly toggled appear
  // here; a rule absent from the map is treated as enabled.
  overrides: z.record(z.string().max(256), ResolutionRuleOverride).default({}),
});
