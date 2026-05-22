/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export type AnonymizationFieldResponse = z.infer<typeof AnonymizationFieldResponse>;
export declare const AnonymizationFieldResponse: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodOptional<z.ZodString>;
    field: z.ZodString;
    allowed: z.ZodOptional<z.ZodBoolean>;
    anonymized: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
    namespace: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
