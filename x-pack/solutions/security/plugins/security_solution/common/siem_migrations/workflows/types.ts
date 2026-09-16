/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { TinesStoryExportSchema } from '../parsers/tines/story_json';
import type { MigrationReport, WorkflowValidationResult } from '../parsers/tines';
import {
  MigrationComments,
  MigrationLastExecution,
  MigrationStatus,
  MigrationTaskStats,
  MigrationTranslationResult,
} from '../model/common.gen';

/**
 * Request body for `POST /internal/siem_migrations/workflows/translate`.
 * Accepts a Tines story export JSON document under `story`.
 */
export const TranslateWorkflowRequestBody = z.object({
  story: TinesStoryExportSchema,
});

export type TranslateWorkflowRequestBody = z.infer<typeof TranslateWorkflowRequestBody>;

export interface TranslateWorkflowResponse {
  yaml: string;
  report: MigrationReport;
  validation: WorkflowValidationResult;
}

/** Original workflow vendor identifier (POC: Tines only). */
export const OriginalWorkflowVendor = z.literal('tines');
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
  id: z.string(),
  vendor: OriginalWorkflowVendor,
  title: z.string(),
  description: z.string().optional(),
  /** Raw Tines story export JSON */
  data: TinesStoryExportSchema,
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

/** API request/response schemas (hand-written, no OAS). */

export const CreateWorkflowMigrationRequestBody = z.object({
  name: z.string().min(1),
});
export type CreateWorkflowMigrationRequestBody = z.infer<typeof CreateWorkflowMigrationRequestBody>;

export const CreateWorkflowMigrationResponse = z.object({
  migration_id: z.string().min(1),
});
export type CreateWorkflowMigrationResponse = z.infer<typeof CreateWorkflowMigrationResponse>;

export const WorkflowMigrationIdParams = z.object({
  migration_id: z.string().min(1),
});
export type WorkflowMigrationIdParams = z.infer<typeof WorkflowMigrationIdParams>;

export const UpdateWorkflowMigrationRequestBody = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateWorkflowMigrationRequestBody = z.infer<typeof UpdateWorkflowMigrationRequestBody>;

export const CreateWorkflowMigrationWorkflowsRequestBody = z.array(TinesStoryExportSchema).min(1);
export type CreateWorkflowMigrationWorkflowsRequestBody = z.infer<
  typeof CreateWorkflowMigrationWorkflowsRequestBody
>;

export const GetWorkflowMigrationWorkflowsRequestQuery = z.object({
  page: z.coerce.number().int().nonnegative().optional(),
  per_page: z.coerce.number().int().positive().optional(),
  search_term: z.string().optional(),
});
export type GetWorkflowMigrationWorkflowsRequestQuery = z.infer<
  typeof GetWorkflowMigrationWorkflowsRequestQuery
>;

export const StartWorkflowMigrationRequestBody = z.object({
  settings: z.object({
    connector_id: z.string().min(1),
  }),
  langsmith_options: z
    .object({
      project_name: z.string(),
      api_key: z.string(),
    })
    .optional(),
});
export type StartWorkflowMigrationRequestBody = z.infer<typeof StartWorkflowMigrationRequestBody>;

export const StartWorkflowMigrationResponse = z.object({
  started: z.boolean(),
});
export type StartWorkflowMigrationResponse = z.infer<typeof StartWorkflowMigrationResponse>;

export const StopWorkflowMigrationResponse = z.object({
  stopped: z.boolean(),
});
export type StopWorkflowMigrationResponse = z.infer<typeof StopWorkflowMigrationResponse>;
