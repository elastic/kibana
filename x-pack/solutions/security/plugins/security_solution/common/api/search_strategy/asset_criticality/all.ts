/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const assetCriticalityRequestOptionsSchema = requestBasicOptionsSchema.extend({
  pagination: z
    .object({
      cursorStart: z.number(),
      querySize: z.number(),
    })
    .optional(),
});

export type AssetCriticalityRequestOptions = z.infer<typeof assetCriticalityRequestOptionsSchema>;
