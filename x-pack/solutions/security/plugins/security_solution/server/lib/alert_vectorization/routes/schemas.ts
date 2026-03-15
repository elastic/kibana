/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const AlertVectorizationInitRequest = z.object({}).strict();

export const AlertVectorizationVectorizeRequest = z
  .object({
    alert_ids: z.array(z.string()).min(1).max(1000),
    inference_endpoint_id: z.string().optional(),
    batch_size: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export type AlertVectorizationVectorizeRequestBody = z.infer<
  typeof AlertVectorizationVectorizeRequest
>;

export const AlertVectorizationSearchRequest = z
  .object({
    alert_id: z.string().optional(),
    text: z.string().optional(),
    threshold: z.number().min(0).max(1).optional(),
    max_results: z.number().int().min(1).max(100).optional(),
    inference_endpoint_id: z.string().optional(),
  })
  .strict()
  .refine((data) => data.alert_id != null || data.text != null, {
    message: 'Either alert_id or text must be provided',
  });

export type AlertVectorizationSearchRequestBody = z.infer<typeof AlertVectorizationSearchRequest>;
