/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/index-adapter';
import type {
  WorkflowMigration,
  WorkflowMigrationWorkflowData,
} from '../../../../../common/siem_migrations/workflows/types';

export const workflowMigrationsFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<WorkflowMigration, 'id' | 'last_execution'>>
> = {
  name: { type: 'keyword', required: true },
  created_at: { type: 'date', required: true },
  created_by: { type: 'keyword', required: true },
};

export const workflowMigrationsWorkflowsFieldMap: FieldMap<
  SchemaFieldMapKeys<WorkflowMigrationWorkflowData>
> = {
  '@timestamp': { type: 'date', required: false },
  migration_id: { type: 'keyword', required: true },
  created_by: { type: 'keyword', required: true },
  status: { type: 'keyword', required: true },
  translation_result: { type: 'keyword', required: false },
  updated_at: { type: 'date', required: true },
  updated_by: { type: 'keyword', required: true },
  original_workflow: { type: 'object', required: true },
  'original_workflow.id': { type: 'keyword', required: true },
  'original_workflow.title': {
    type: 'text',
    required: true,
    fields: { keyword: { type: 'keyword' } },
  },
  'original_workflow.description': { type: 'text', required: false },
  'original_workflow.vendor': { type: 'keyword', required: true },
  'original_workflow.data': { type: 'object', required: true },
  elastic_workflow: { type: 'object', required: false },
  'elastic_workflow.id': { type: 'keyword', required: false },
  'elastic_workflow.title': {
    type: 'text',
    required: false,
    fields: { keyword: { type: 'keyword' } },
  },
  'elastic_workflow.description': { type: 'text', required: false },
  'elastic_workflow.yaml': { type: 'text', required: false },
  comments: { type: 'object', array: true, required: false },
  'comments.message': { type: 'keyword', required: true },
  'comments.created_at': { type: 'date', required: true },
  'comments.created_by': { type: 'keyword', required: true },
};
