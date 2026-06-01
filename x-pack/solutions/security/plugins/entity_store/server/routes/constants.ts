/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { LogExtractionConfigSchema, HistorySnapshotState } from '../domain/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

export const RESOLUTION_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution', 'securitySolution-entity-analytics'],
};

// Used for the `/install` and `/update` HTTP body, all fields optional
export type LogExtractionConfigBody = z.infer<typeof LogExtractionConfigBody>;
export const LogExtractionConfigBody = LogExtractionConfigSchema.omit({ timeout: true }).partial();

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();
