/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { HistorySnapshotState, LogExtractionConfig } from '../domain/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

export const RESOLUTION_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution', 'securitySolution-entity-analytics'],
};

export type LogExtractionInstallParams = z.infer<typeof LogExtractionInstallParams>;
// timeout: intentionally excluded from LogExtractionBodyParams
// TODO: add timeout once we have a way to set it as a task override param
export const LogExtractionInstallParams = LogExtractionConfig.pick({
  filter: true,
  fieldHistoryLength: true,
  additionalIndexPatterns: true,
  lookbackPeriod: true,
  frequency: true,
  delay: true,
  docsLimit: true,
  maxLogsPerPage: true,
}).partial();

export type LogExtractionUpdateParams = z.infer<typeof LogExtractionUpdateParams>;

export const LogExtractionUpdateParams = z.object({
  filter: z.string().optional(),
  fieldHistoryLength: z.number().int().optional(),
  additionalIndexPatterns: z.array(z.string()).optional(),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .optional(),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .optional(),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .optional(),
  docsLimit: z.number().int().min(1).optional(),
  maxLogsPerPage: z.number().int().min(1).optional(),
});

export type LogExtractionBodyParams = LogExtractionInstallParams | LogExtractionUpdateParams;

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();
