/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { TinesStoryExport } from '../model/vendor/workflows/tines.gen';
import {
  MigrationComments,
  MigrationLastExecution,
  MigrationStatus,
  MigrationTaskStats,
  MigrationTranslationResult,
} from '../model/common.gen';

/** Original workflow vendor identifier (POC: Tines only). */
export const OriginalWorkflowVendor = lazySchema(() => z.literal('tines'));
export type OriginalWorkflowVendor = z.infer<typeof OriginalWorkflowVendor>;

export const WorkflowMigrationData = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(1024),
    created_by: z.string().min(1).max(256),
    created_at: z.string().min(1).max(64),
    last_execution: MigrationLastExecution.optional(),
  })
);
export type WorkflowMigrationData = z.infer<typeof WorkflowMigrationData>;

export const WorkflowMigration = lazySchema(() =>
  WorkflowMigrationData.extend({
    id: z.string().min(1).max(256),
  })
);
export type WorkflowMigration = z.infer<typeof WorkflowMigration>;

export const OriginalWorkflow = lazySchema(() =>
  z.object({
    id: z.string().max(256),
    vendor: OriginalWorkflowVendor,
    title: z.string().min(1).max(1024),
    description: z.string().max(10000).optional(),
    /** Raw Tines story export JSON */
    data: TinesStoryExport,
  })
);
export type OriginalWorkflow = z.infer<typeof OriginalWorkflow>;

export const ElasticWorkflow = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(256).optional(),
    title: z.string().min(1).max(1024),
    description: z.string().max(10000).optional(),
    /** Translated Elastic Workflow YAML */
    yaml: z.string().max(1_000_000).optional(),
  })
);
export type ElasticWorkflow = z.infer<typeof ElasticWorkflow>;

export const WorkflowMigrationWorkflowData = lazySchema(() =>
  z.object({
    '@timestamp': z.string().min(1).max(64),
    migration_id: z.string().min(1).max(256),
    created_by: z.string().min(1).max(256),
    original_workflow: OriginalWorkflow,
    elastic_workflow: ElasticWorkflow.optional(),
    translation_result: MigrationTranslationResult.optional(),
    status: MigrationStatus.default('pending'),
    comments: MigrationComments.optional(),
    updated_at: z.string().max(64).optional(),
    updated_by: z.string().max(256).optional(),
  })
);
export type WorkflowMigrationWorkflowData = z.infer<typeof WorkflowMigrationWorkflowData>;

export const WorkflowMigrationWorkflow = lazySchema(() =>
  WorkflowMigrationWorkflowData.extend({
    id: z.string().min(1).max(256),
  })
);
export type WorkflowMigrationWorkflow = z.infer<typeof WorkflowMigrationWorkflow>;

export const WorkflowMigrationTaskStats = MigrationTaskStats;
export type WorkflowMigrationTaskStats = z.infer<typeof WorkflowMigrationTaskStats>;

export {
  CreateWorkflowMigrationRequestBody,
  CreateWorkflowMigrationResponse,
  CreateWorkflowMigrationWorkflowsRequestBody,
  CreateWorkflowMigrationWorkflowsRequestParams,
  DeleteWorkflowMigrationRequestParams,
  GetAllWorkflowMigrationStatsResponse,
  GetWorkflowMigrationRequestParams,
  GetWorkflowMigrationResponse,
  GetWorkflowMigrationStatsRequestParams,
  GetWorkflowMigrationStatsResponse,
  GetWorkflowMigrationTranslationStatsRequestParams,
  GetWorkflowMigrationTranslationStatsResponse,
  GetWorkflowMigrationWorkflowsRequestParams,
  GetWorkflowMigrationWorkflowsRequestQuery,
  GetWorkflowMigrationWorkflowsResponse,
  StartWorkflowMigrationRequestBody,
  StartWorkflowMigrationRequestParams,
  StartWorkflowMigrationResponse,
  StopWorkflowMigrationRequestParams,
  StopWorkflowMigrationResponse,
  UpdateWorkflowMigrationRequestBody,
  UpdateWorkflowMigrationRequestParams,
  UpdateWorkflowMigrationWorkflow,
  UpdateWorkflowMigrationWorkflowsRequestBody,
  UpdateWorkflowMigrationWorkflowsRequestParams,
  UpdateWorkflowMigrationWorkflowsResponse,
} from '../model/api/workflows/workflow_migration.gen';
