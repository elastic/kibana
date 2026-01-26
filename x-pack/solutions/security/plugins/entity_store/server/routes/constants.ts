/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import { z } from '@kbn/zod';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v2: '2',
  },
};

export type LogExtractionBodyParams = z.infer<typeof LogExtractionBodyParams>;
export const LogExtractionBodyParams = z.object({
  filter: z.string().optional(),
  fieldHistoryLength: z.number().int().optional().default(10),
  additionalIndexPattern: z.string().optional(),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .optional()
    .default('3h'),
  // timeout: z
  //   .string()
  //   .regex(/[smdh]$/)
  //   .optional(),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .optional(),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .optional()
    .default('1m'),
  docsLimit: z.number().int().optional().default(10000),
});
