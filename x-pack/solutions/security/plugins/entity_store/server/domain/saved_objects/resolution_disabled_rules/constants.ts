/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export type ResolutionDisabledRules = z.infer<typeof ResolutionDisabledRules>;
export const ResolutionDisabledRules = z.object({
  // Ids of resolution rules an operator has turned off. A rule absent from this
  // list is enabled (the default).
  disabledRuleIds: z.array(z.string().max(256)).max(1000).default([]),
});
