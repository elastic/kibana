/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type EntityMaintainerTaskEntry = z.infer<typeof EntityMaintainerTaskEntry>;
export const EntityMaintainerTaskEntry = z.object({
  id: z.string(),
  interval: z.string().regex(/[smdh]$/),
});
