/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { MigrationComments } from '../../../../../../common/siem_migrations/model/common.gen';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type {
  ElasticWorkflow,
  OriginalWorkflow,
} from '../../../../../../common/siem_migrations/workflows/types';
import type {
  MigrationReport,
  WorkflowValidationResult,
} from '../../../../../../common/siem_migrations/parsers/tines';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateWorkflowConfigSchema, migrateWorkflowState } from './state';

export type MigrateWorkflowState = typeof migrateWorkflowState.State;
export type MigrateWorkflowConfigSchema = (typeof migrateWorkflowConfigSchema)['State'];
export type MigrateWorkflowConfig = RunnableConfig<MigrateWorkflowConfigSchema>;

export type GraphNode = (
  state: MigrateWorkflowState,
  config: MigrateWorkflowConfig
) => Promise<Partial<MigrateWorkflowState>>;

export interface MigrateWorkflowGraphParams {
  model: ChatModel;
  logger: Logger;
}

export interface WorkflowMigrationTaskInput {
  id: string;
  original_workflow: OriginalWorkflow;
}

export type WorkflowMigrationTaskOutput = {
  elastic_workflow: ElasticWorkflow;
  translation_result?: MigrationTranslationResult;
  comments?: MigrationComments;
};

export type { MigrationReport, WorkflowValidationResult };
