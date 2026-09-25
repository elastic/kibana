/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { uniq } from 'lodash/fp';
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

export const migrateWorkflowState = Annotation.Root({
  id: Annotation<string>(),
  original_workflow: Annotation<OriginalWorkflow>(),
  yaml: Annotation<string>(),
  report: Annotation<MigrationReport | undefined>(),
  validation: Annotation<WorkflowValidationResult | undefined>(),
  llm_summary: Annotation<string | undefined>(),
  elastic_workflow: Annotation<ElasticWorkflow>({
    reducer: (current, value) => ({ ...current, ...value }),
  }),
  translation_result: Annotation<MigrationTranslationResult>(),
  comments: Annotation<MigrationComments>({
    reducer: (current, value) => uniq(value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

export const migrateWorkflowConfigSchema = Annotation.Root({});
