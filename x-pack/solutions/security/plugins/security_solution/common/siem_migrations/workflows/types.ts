/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MigrationComments,
  MigrationLastExecution,
  MigrationStatus,
  MigrationTaskStats,
  MigrationTranslationResult,
} from '../model/common.gen';

/**
 * Workflows migration source vendors. Add new vendors here; upload configs and
 * `OriginalWorkflowVendor` pick them up automatically.
 */
export enum WorkflowMigrationSource {
  TINES = 'tines',
}

/**
 * Original workflow vendor identifier (Tines first; union later).
 * Replaces the POC `z.literal('tines')` so the HTTP/storage contract stays
 * vendor-keyed instead of Tines-hardcoded.
 */
export const OriginalWorkflowVendor = z.nativeEnum(WorkflowMigrationSource);
export type OriginalWorkflowVendor = z.infer<typeof OriginalWorkflowVendor>;

export const WorkflowMigrationData = z.object({
  name: z.string().min(1),
  created_by: z.string().min(1),
  created_at: z.string().min(1),
  last_execution: MigrationLastExecution.optional(),
});
export type WorkflowMigrationData = z.infer<typeof WorkflowMigrationData>;

export const WorkflowMigration = WorkflowMigrationData.extend({
  id: z.string().min(1),
});
export type WorkflowMigration = z.infer<typeof WorkflowMigration>;

export const OriginalWorkflow = z.object({
  id: z.string().min(1),
  vendor: OriginalWorkflowVendor,
  title: z.string().min(1),
  description: z.string().optional(),
  /** Vendor-specific export payload; parsed per `vendor` on ingest. */
  data: z.unknown(),
});
export type OriginalWorkflow = z.infer<typeof OriginalWorkflow>;

export const ElasticWorkflow = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  /** Translated Elastic Workflow YAML */
  yaml: z.string().optional(),
});
export type ElasticWorkflow = z.infer<typeof ElasticWorkflow>;

export const WorkflowMigrationWorkflowData = z.object({
  '@timestamp': z.string(),
  migration_id: z.string().min(1),
  created_by: z.string().min(1),
  original_workflow: OriginalWorkflow,
  elastic_workflow: ElasticWorkflow.optional(),
  translation_result: MigrationTranslationResult.optional(),
  status: MigrationStatus.default('pending'),
  comments: MigrationComments.optional(),
  updated_at: z.string().optional(),
  updated_by: z.string().optional(),
});
export type WorkflowMigrationWorkflowData = z.infer<typeof WorkflowMigrationWorkflowData>;

export const WorkflowMigrationWorkflow = WorkflowMigrationWorkflowData.extend({
  id: z.string().min(1),
});
export type WorkflowMigrationWorkflow = z.infer<typeof WorkflowMigrationWorkflow>;

export const WorkflowMigrationTaskStats = MigrationTaskStats;
export type WorkflowMigrationTaskStats = z.infer<typeof WorkflowMigrationTaskStats>;
