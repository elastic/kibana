/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TasksConfig } from '../../../tasks/config';
import { EntityStoreTaskType } from '../../../tasks/constants';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';

export type EngineStatus = z.infer<typeof EngineStatus>;
export const EngineStatus = z.enum(['installing', 'started', 'stopped', 'updating', 'error']);

export const DELAY_DEFAULT = '1m';
export const LOOKBACK_PERIOD_DEFAULT = '3h';

export type LogExtractionState = z.infer<typeof LogExtractionState>;
export const LogExtractionState = z.object({
  filter: z.string().default(''),
  additionalIndexPatterns: z.array(z.string()).default([]),
  fieldHistoryLength: z.number().int().default(10),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .default(LOOKBACK_PERIOD_DEFAULT),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .default(DELAY_DEFAULT),
  docsLimit: z.number().int().positive().default(10000),
  timeout: z
    .string()
    .regex(/[smdh]$/)
    .default('25s'),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default(TasksConfig[EntityStoreTaskType.Values.extractEntity].interval),
  paginationTimestamp: z.string().optional(),
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
  logExtractionState: LogExtractionState,
  error: EngineError.optional(),
  versionState: VersionState,
});
