/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternAdapter } from '@kbn/index-adapter';
import type {
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from '../../../../common/siem_migrations/workflows/types';
import type { Stored } from '../types';

export interface WorkflowMigrationAdapters {
  migrations: IndexPatternAdapter;
  workflows: IndexPatternAdapter;
  resources: IndexPatternAdapter;
}

export type WorkflowMigrationAdapterId = keyof WorkflowMigrationAdapters;

export type WorkflowMigrationIndexNameProvider = () => Promise<string>;
export type WorkflowMigrationIndexNameProviders = Record<
  WorkflowMigrationAdapterId,
  WorkflowMigrationIndexNameProvider
>;

export type StoredWorkflowMigration = Stored<WorkflowMigration>;
export type StoredWorkflowMigrationWorkflow = Stored<WorkflowMigrationWorkflow>;
