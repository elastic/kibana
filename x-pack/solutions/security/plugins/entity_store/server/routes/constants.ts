/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { HistorySnapshotState, LogExtractionConfig } from '../domain/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

// Matches the requiredPrivileges declared by the Security Solution asset criticality HTTP routes
// (e.g. `.../asset_criticality/routes/upsert.ts`), so callers that bypass Kibana's route-level
// authorization (a synthetic/fake request) can enforce the same Kibana feature privilege.
export const ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES = [
  'securitySolution',
  'securitySolution-entity-analytics',
];

export const RESOLUTION_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES,
};

// Overrides-only API body. timeout is excluded until task override support exists.
export const LogExtractionBodyParams = LogExtractionConfig.omit({
  timeout: true,
}).partial();
export type LogExtractionBodyParams = z.infer<typeof LogExtractionBodyParams>;

/** @deprecated Prefer LogExtractionBodyParams — kept for existing install/update schema names. */
export const LogExtractionInstallParams = LogExtractionBodyParams;
export type LogExtractionInstallParams = LogExtractionBodyParams;

/** @deprecated Prefer LogExtractionBodyParams — kept for existing install/update schema names. */
export const LogExtractionUpdateParams = LogExtractionBodyParams;
export type LogExtractionUpdateParams = LogExtractionBodyParams;

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();
