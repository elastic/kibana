/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type { MigrationComments } from '../../../../../../common/siem_migrations/model/common.gen';
import type {
  ElasticWorkflow,
  OriginalWorkflow,
} from '../../../../../../common/siem_migrations/model/workflow_migration.gen';
import type { migrateWorkflowState } from './state';

export interface WorkflowMigrationTaskInput {
  id: string;
  original_workflow: OriginalWorkflow;
}

export interface WorkflowMigrationTaskOutput {
  elastic_workflow: ElasticWorkflow;
  translation_result: MigrationTranslationResult;
  comments: MigrationComments;
}

export type MigrateWorkflowState = typeof migrateWorkflowState.State;

/** Placeholder config until the real translation graph needs invocation options. */
export type MigrateWorkflowConfigSchema = Record<string, never>;
