/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type { MigrationComments } from '../../../../../../common/siem_migrations/model/common.gen';
import type {
  ElasticWorkflow,
  OriginalWorkflow,
} from '../../../../../../common/siem_migrations/model/workflow_migration.gen';

/** Graph state omits the raw export so tracing callbacks do not receive it. */
export type WorkflowMigrationGraphWorkflow = Omit<OriginalWorkflow, 'data'>;

export const migrateWorkflowState = Annotation.Root({
  id: Annotation<string>(),
  original_workflow: Annotation<WorkflowMigrationGraphWorkflow>(),
  elastic_workflow: Annotation<ElasticWorkflow>(),
  translation_result: Annotation<MigrationTranslationResult>(),
  comments: Annotation<MigrationComments>(),
});
