/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { HistorySnapshotState } from '../domain/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

export const RESOLUTION_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution', 'securitySolution-entity-analytics'],
};

export type LogExtractionUpdateParams = z.infer<typeof LogExtractionUpdateParams>;

// Index pattern strings are bounded to Elasticsearch's own index name length limit.
const MAX_INDEX_PATTERN_LENGTH = 255;
// Duration strings (e.g. "10m", "1h") are always short; bounded defensively.
const MAX_DURATION_STRING_LENGTH = 32;

export const LogExtractionUpdateParams = z.object({
  fieldHistoryLength: z.number().int().optional(),
  additionalIndexPatterns: z.array(z.string().max(MAX_INDEX_PATTERN_LENGTH)).optional(),
  excludedIndexPatterns: z.array(z.string().max(MAX_INDEX_PATTERN_LENGTH)).optional(),
  lookbackPeriod: z
    .string()
    .max(MAX_DURATION_STRING_LENGTH)
    .regex(/[smdh]$/)
    .optional(),
  frequency: z
    .string()
    .max(MAX_DURATION_STRING_LENGTH)
    .regex(/[smdh]$/)
    .optional(),
  delay: z
    .string()
    .max(MAX_DURATION_STRING_LENGTH)
    .regex(/[smdh]$/)
    .optional(),
  docsLimit: z.number().int().min(1).optional(),
  maxLogsPerPage: z.number().int().min(1).optional(),
  maxTimeWindowSize: z
    .string()
    .max(MAX_DURATION_STRING_LENGTH)
    .regex(/[smdh]$/)
    .optional(),
  maxLogsPerWindow: z.number().int().min(0).optional(),
  maxLogsPerWindowCapBehavior: z.enum(['defer', 'drop']).optional(),
});

// timeout: intentionally excluded from LogExtractionBodyParams
// TODO: add timeout once we have a way to set it as a task override param
//
// Reuses `LogExtractionUpdateParams` rather than `LogExtractionConfig.pick(...).partial()`:
// the latter inherits `LogExtractionConfig`'s `.default(...)` values, so an omitted field
// would come back from validation already filled in with its default — indistinguishable
// from a field the caller explicitly set. That silently broke merge-with-existing-config
// and per-type cadence override detection on install (see #269261).
export type LogExtractionInstallParams = LogExtractionUpdateParams;
export const LogExtractionInstallParams = LogExtractionUpdateParams;

export type LogExtractionBodyParams = LogExtractionInstallParams | LogExtractionUpdateParams;

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();
