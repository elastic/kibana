/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';

export type EngineStatus = z.infer<typeof EngineStatus>;
export const EngineStatus = z.enum(['installing', 'started', 'stopped', 'updating', 'error']);

export type EngineLogExtractionState = z.infer<typeof EngineLogExtractionState>;
export const EngineLogExtractionState = z.object({
  paginationTimestamp: z.string().optional(),
  paginationId: z.string().optional(),
  lastExecutionTimestamp: z.string().optional(),
});

export type EngineError = z.infer<typeof EngineError>;
export const EngineError = z.object({
  message: z.string(),
  action: z.enum(['init', 'extractLogs']),
});

export type VersionState = z.infer<typeof VersionState>;
export const VersionState = z.object({
  version: z.union([z.literal(1), z.literal(2)]).default(2),
  state: z.enum(['running', 'migrating']).default('running'),
  isMigratedFromV1: z.boolean().default(false),
});

export type EngineDescriptor = z.infer<typeof EngineDescriptor>;
export const EngineDescriptor = z.object({
  type: EntityType,
  status: EngineStatus,
  logExtractionState: EngineLogExtractionState,
  error: EngineError.optional(),
  versionState: VersionState,
});
