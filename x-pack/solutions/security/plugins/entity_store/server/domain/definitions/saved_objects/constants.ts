/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: This file is manually maintained.
 *
 * info:
 *   title: Entity Store V2 Saved Object Schema
 *   version: 2
 */

import { z } from '@kbn/zod';
import { EntityType } from '../entity_schema';

export type EngineStatus = z.infer<typeof EngineStatus>;
export const EngineStatus = z.enum(['installing', 'started', 'stopped', 'updating', 'error']);

export type LogExtractionState = z.infer<typeof LogExtractionState>;
export const LogExtractionState = z.object({
  filter: z.string().default(''),
  additionalIndexPattern: z.string().default(''),
  fieldHistoryLength: z.number().int().default(10),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .default('3h'),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .default('1m'),
  docsLimit: z.number().int().default(10000),
  timeout: z
    .string()
    .regex(/[smdh]$/)
    .default('25s'),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default('30s'),
  paginationTimestamp: z.string().default(''),
  lastExecutionTimestamp: z.string().default(''),
});

export type EngineError = z.infer<typeof EngineError>;
export const EngineError = z.object({
  message: z.string(),
  action: z.literal('init'),
});

export type VersionState = z.infer<typeof VersionState>;
export const VersionState = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  state: z.enum(['running', 'migrating']),
  isMigratedFromV1: z.boolean().default(false),
});

export type EngineDescriptor = z.infer<typeof EngineDescriptor>;
export const EngineDescriptor = z.object({
  type: EntityType,
  status: EngineStatus,
  logExtractionState: LogExtractionState,
  error: EngineError.optional(),
  versionState: VersionState,
});
