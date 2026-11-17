/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type { MigrationComments } from '../../../../../../common/siem_migrations/model/common.gen';
import type {
  ElasticWorkflow,
  OriginalWorkflow,
} from '../../../../../../common/siem_migrations/model/workflow_migration.gen';

export interface WorkflowMigrationTaskInput {
  id: string;
  original_workflow: OriginalWorkflow;
}

export interface WorkflowMigrationTaskOutput {
  elastic_workflow: ElasticWorkflow;
  translation_result: MigrationTranslationResult;
  comments: MigrationComments;
}

/** Placeholder config until the real translation graph needs invocation options. */
export type MigrateWorkflowConfigSchema = Record<string, never>;

export interface WorkflowMigrationAgent {
  invoke: (
    input: WorkflowMigrationTaskInput,
    config?: RunnableConfig<MigrateWorkflowConfigSchema>
  ) => Promise<WorkflowMigrationTaskOutput>;
}
