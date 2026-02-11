/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type {
  ElasticRulePartial,
  OriginalRule,
  RuleMigrationRule,
} from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type { RuleMigrationIntegration } from '../../../../types';
import type { TranslateRuleValidationErrors } from './types';

export const translateRuleState = Annotation.Root({
  original_rule: Annotation<OriginalRule>(),
  resources: Annotation<MigrationResources>(),
  integration: Annotation<RuleMigrationIntegration>({
    reducer: (current, value) => value ?? current,
    default: () => ({} as RuleMigrationIntegration),
  }),
  includes_ecs_mapping: Annotation<boolean>({
    reducer: (current, value) => value ?? current,
    default: () => false,
  }),
  inline_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  semantic_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  elastic_rule: Annotation<ElasticRulePartial>({
    reducer: (state, action) => ({ ...state, ...action }),
    default: () => ({} as ElasticRulePartial),
  }),
  validation_errors: Annotation<TranslateRuleValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ retries_left: 3 }),
  }),
  translation_result: Annotation<MigrationTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => MigrationTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<RuleMigrationRule['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
  /* Natural Language Query */
  nl_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
});
