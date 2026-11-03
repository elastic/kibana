/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ArrayFromString, BooleanFromString } from '@kbn/zod-helpers/v4';
import { TinesStoryExportSchema } from '../model/vendor/workflows/tines';
import {
  LangSmithOptions,
  MigrationComments,
  MigrationLastExecution,
  MigrationStatus,
  MigrationTaskStats,
  MigrationTranslationResult,
  MigrationTranslationStats,
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
    data: TinesStoryExportSchema,
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

/** API request/response schemas (hand-written, no OAS). */

export const WorkflowMigrationIdParams = lazySchema(() =>
  z.object({
    migration_id: z.string().min(1).max(256),
  })
);
export type WorkflowMigrationIdParams = z.infer<typeof WorkflowMigrationIdParams>;

export const CreateWorkflowMigrationRequestBody = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(1024),
  })
);
export type CreateWorkflowMigrationRequestBody = z.infer<typeof CreateWorkflowMigrationRequestBody>;

export const CreateWorkflowMigrationResponse = lazySchema(() =>
  z.object({
    migration_id: z.string().max(256),
  })
);
export type CreateWorkflowMigrationResponse = z.infer<typeof CreateWorkflowMigrationResponse>;

export const GetWorkflowMigrationResponse = WorkflowMigration;
export type GetWorkflowMigrationResponse = z.infer<typeof GetWorkflowMigrationResponse>;

export const UpdateWorkflowMigrationRequestBody = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(1024).optional(),
  })
);
export type UpdateWorkflowMigrationRequestBody = z.infer<typeof UpdateWorkflowMigrationRequestBody>;

export const CreateWorkflowMigrationWorkflowsRequestBody = lazySchema(() =>
  z.array(TinesStoryExportSchema).max(1000)
);
export type CreateWorkflowMigrationWorkflowsRequestBody = z.infer<
  typeof CreateWorkflowMigrationWorkflowsRequestBody
>;

export const GetWorkflowMigrationWorkflowsRequestQuery = lazySchema(() =>
  z.object({
    page: z.coerce.number().int().nonnegative().max(100000).optional(),
    per_page: z.coerce.number().int().positive().max(1000).optional(),
    sort_field: z.string().min(1).max(256).optional(),
    sort_direction: z.enum(['asc', 'desc']).optional(),
    search_term: z.string().max(1000).optional(),
    ids: ArrayFromString(z.string().min(1).max(256)).optional(),
    is_installed: BooleanFromString.optional(),
    is_fully_translated: BooleanFromString.optional(),
    is_partially_translated: BooleanFromString.optional(),
    is_untranslatable: BooleanFromString.optional(),
    is_failed: BooleanFromString.optional(),
  })
);
export type GetWorkflowMigrationWorkflowsRequestQuery = z.infer<
  typeof GetWorkflowMigrationWorkflowsRequestQuery
>;

export const GetWorkflowMigrationWorkflowsResponse = lazySchema(() =>
  z.object({
    total: z.number().int().nonnegative(),
    data: z.array(WorkflowMigrationWorkflow),
  })
);
export type GetWorkflowMigrationWorkflowsResponse = z.infer<
  typeof GetWorkflowMigrationWorkflowsResponse
>;

export const UpdateWorkflowMigrationWorkflow = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(256),
    elastic_workflow: ElasticWorkflow.optional(),
    comments: MigrationComments.optional(),
  })
);
export type UpdateWorkflowMigrationWorkflow = z.infer<typeof UpdateWorkflowMigrationWorkflow>;

export const UpdateWorkflowMigrationWorkflowsRequestBody = lazySchema(() =>
  z.array(UpdateWorkflowMigrationWorkflow).max(1000)
);
export type UpdateWorkflowMigrationWorkflowsRequestBody = z.infer<
  typeof UpdateWorkflowMigrationWorkflowsRequestBody
>;

export const UpdateWorkflowMigrationWorkflowsResponse = lazySchema(() =>
  z.object({
    updated: z.boolean(),
  })
);
export type UpdateWorkflowMigrationWorkflowsResponse = z.infer<
  typeof UpdateWorkflowMigrationWorkflowsResponse
>;

export const StartWorkflowMigrationRequestBody = lazySchema(() =>
  z.object({
    settings: z.object({
      connector_id: z.string().min(1).max(256),
    }),
    langsmith_options: LangSmithOptions.optional(),
    retry: z.enum(['failed', 'not_fully_translated', 'selected']).optional(),
    selection: z
      .object({
        ids: z.array(z.string().min(1).max(256)).max(10000),
      })
      .optional(),
  })
);
export type StartWorkflowMigrationRequestBody = z.infer<typeof StartWorkflowMigrationRequestBody>;

export const StartWorkflowMigrationResponse = lazySchema(() =>
  z.object({
    started: z.boolean(),
  })
);
export type StartWorkflowMigrationResponse = z.infer<typeof StartWorkflowMigrationResponse>;

export const StopWorkflowMigrationResponse = lazySchema(() =>
  z.object({
    stopped: z.boolean(),
  })
);
export type StopWorkflowMigrationResponse = z.infer<typeof StopWorkflowMigrationResponse>;

export const GetAllWorkflowMigrationStatsResponse = lazySchema(() => z.array(MigrationTaskStats));
export type GetAllWorkflowMigrationStatsResponse = z.infer<
  typeof GetAllWorkflowMigrationStatsResponse
>;

export const GetWorkflowMigrationStatsResponse = MigrationTaskStats;
export type GetWorkflowMigrationStatsResponse = z.infer<typeof GetWorkflowMigrationStatsResponse>;

export const GetWorkflowMigrationTranslationStatsResponse = MigrationTranslationStats;
export type GetWorkflowMigrationTranslationStatsResponse = z.infer<
  typeof GetWorkflowMigrationTranslationStatsResponse
>;
