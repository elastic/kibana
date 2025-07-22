/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/data-stream-adapter';
import type {
  RuleMigration,
  RuleMigrationResource,
  RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationIntegration, RuleMigrationPrebuiltRule } from '../types';

export const ruleMigrationsFieldMap: FieldMap<SchemaFieldMapKeys<Omit<RuleMigrationRule, 'id'>>> = {
  '@timestamp': { type: 'date', required: false },
  migration_id: { type: 'keyword', required: true },
  created_by: { type: 'keyword', required: true },
  status: { type: 'keyword', required: true },
  original_rule: { type: 'object', required: true },
  'original_rule.vendor': { type: 'keyword', required: true },
  'original_rule.id': { type: 'keyword', required: true },
  'original_rule.title': { type: 'text', required: true, fields: { keyword: { type: 'keyword' } } },
  'original_rule.description': { type: 'text', required: false },
  'original_rule.query': { type: 'text', required: true },
  'original_rule.query_language': { type: 'keyword', required: true },
  'original_rule.annotations': { type: 'object', required: false },
  'original_rule.annotations.mitre_attack': { type: 'keyword', array: true, required: false },
  'original_rule.severity': { type: 'keyword', required: false },
  elastic_rule: { type: 'object', required: false },
  'elastic_rule.title': { type: 'text', required: true, fields: { keyword: { type: 'keyword' } } },
  'elastic_rule.integration_ids': { type: 'keyword', required: false, array: true },
  'elastic_rule.query': { type: 'text', required: true },
  'elastic_rule.query_language': { type: 'keyword', required: true },
  'elastic_rule.description': { type: 'text', required: false },
  'elastic_rule.risk_score': { type: 'short', required: false },
  'elastic_rule.severity': { type: 'keyword', required: false },
  'elastic_rule.prebuilt_rule_id': { type: 'keyword', required: false },
  'elastic_rule.id': { type: 'keyword', required: false },
  translation_result: { type: 'keyword', required: false },
  comments: { type: 'object', array: true, required: false },
  'comments.message': { type: 'keyword', required: true },
  'comments.created_at': { type: 'date', required: true },
  'comments.created_by': { type: 'keyword', required: true }, // use 'assistant' for llm
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};

export const ruleMigrationResourcesFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<RuleMigrationResource, 'id'>>
> = {
  migration_id: { type: 'keyword', required: true },
  type: { type: 'keyword', required: true },
  name: { type: 'keyword', required: true },
  content: { type: 'text', required: false },
  metadata: { type: 'object', required: false },
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};

export const getIntegrationsFieldMap: ({
  elserInferenceId,
}: {
  elserInferenceId?: string;
}) => FieldMap<SchemaFieldMapKeys<RuleMigrationIntegration>> = ({ elserInferenceId }) => ({
  id: { type: 'keyword', required: true },
  title: { type: 'text', required: true },
  description: { type: 'text', required: true },
  data_streams: { type: 'object', array: true, required: true },
  'data_streams.dataset': { type: 'keyword', required: true },
  'data_streams.title': { type: 'text', required: true },
  'data_streams.index_pattern': { type: 'keyword', required: true },
  elser_embedding: {
    type: 'semantic_text',
    required: true,
    ...(elserInferenceId ? { inference_id: elserInferenceId } : {}),
  },
});

export const getPrebuiltRulesFieldMap: ({
  elserInferenceId,
}: {
  elserInferenceId?: string;
}) => FieldMap<SchemaFieldMapKeys<RuleMigrationPrebuiltRule>> = ({ elserInferenceId }) => ({
  name: { type: 'text', required: true },
  description: { type: 'text', required: true },
  elser_embedding: {
    type: 'semantic_text',
    required: true,
    ...(elserInferenceId ? { inference_id: elserInferenceId } : {}),
  },
  rule_id: { type: 'keyword', required: true },
  mitre_attack_ids: { type: 'keyword', array: true, required: false },
});

export const migrationsFieldMaps: FieldMap<
  SchemaFieldMapKeys<Omit<RuleMigration, 'id' | 'last_execution'>>
> = {
  name: { type: 'keyword', required: true },
  created_at: { type: 'date', required: true },
  created_by: { type: 'keyword', required: true },
};
