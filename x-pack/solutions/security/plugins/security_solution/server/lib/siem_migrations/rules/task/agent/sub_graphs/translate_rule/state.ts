/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { RuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type {
  ElasticRulePartial,
  OriginalRule,
  RuleMigration,
} from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationIntegration } from '../../../../types';
import type { TranslateRuleValidationErrors } from './types';

export const translateRuleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  original_rule: Annotation<OriginalRule>(),
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
    default: () => ({}),
  }),
  validation_errors: Annotation<TranslateRuleValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ iterations: 0 } as TranslateRuleValidationErrors),
  }),
  translation_result: Annotation<RuleTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => RuleTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<RuleMigration['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
});
