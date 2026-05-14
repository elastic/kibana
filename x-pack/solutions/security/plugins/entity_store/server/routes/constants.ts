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
  fieldHistoryLength: true,
  additionalIndexPatterns: true,
  excludedIndexPatterns: true,
  lookbackPeriod: true,
  frequency: true,
  delay: true,
  docsLimit: true,
  maxLogsPerPage: true,
  maxTimeWindowSize: true,
}).partial();

export type LogExtractionUpdateParams = z.infer<typeof LogExtractionUpdateParams>;

export const LogExtractionUpdateParams = z.object({
  fieldHistoryLength: z.number().int().optional(),
  additionalIndexPatterns: z.array(z.string()).optional(),
  excludedIndexPatterns: z.array(z.string()).optional(),
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
  maxTimeWindowSize: z
    .string()
    .regex(/[smdh]$/)
    .optional(),
});

export type LogExtractionBodyParams = LogExtractionInstallParams | LogExtractionUpdateParams;

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();

/**
 * Partial-update body schema for the `knowledgeIndicators` block of the
 * global state SO. Mirrors `KnowledgeIndicatorsConfig` (defined in
 * `domain/saved_objects/global_state/constants.ts`) but every field is
 * optional so callers can update one knob at a time. Field-level
 * validation (range, integer-ness) is duplicated here intentionally so
 * the route returns a 400 with a friendly path-prefixed error message
 * before reaching the SO write.
 *
 * `promoteToTypedThreshold` is `nullable` (explicitly setting `null` is
 * the documented way to disable promotion); cross-field validation
 * (`promoteToTypedThreshold >= entityMinConfidence`) lives in the update
 * route's `superRefine` so we can read the persisted SO state for the
 * other side of the comparison when only one knob is in the body.
 */
export type KnowledgeIndicatorsUpdateParams = z.infer<typeof KnowledgeIndicatorsUpdateParams>;
export const KnowledgeIndicatorsUpdateParams = z.object({
  entityMinConfidence: z.number().int().min(0).max(100).optional(),
  aggregationGroupCap: z.number().int().min(1).optional(),
  promoteToTypedThreshold: z.number().int().min(0).max(100).nullable().optional(),
  promotedEntityTypes: z.array(z.enum(['host', 'service'])).optional(),
  /**
   * Schema-feature alias adoption confidence threshold. `null` (the default)
   * disables alias adoption and the static engines run their existing
   * single-pass extraction unchanged. Set to a number 0–100 to enable
   * Option E identity aliases on streams whose schema features clear the bar.
   * See `KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT` in
   * `server/domain/saved_objects/global_state/constants.ts` for rationale.
   */
  schemaAliasMinConfidence: z.number().int().min(0).max(100).nullable().optional(),
});
