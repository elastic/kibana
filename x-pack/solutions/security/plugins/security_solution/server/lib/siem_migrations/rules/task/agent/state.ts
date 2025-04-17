/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { uniq } from 'lodash/fp';
import type { RuleTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type {
  ElasticRulePartial,
  OriginalRule,
  RuleMigration,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export const migrateRuleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  original_rule: Annotation<OriginalRule>(),
  elastic_rule: Annotation<ElasticRulePartial>({
    reducer: (state, action) => ({ ...state, ...action }),
  }),
  semantic_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  inline_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  translation_result: Annotation<RuleTranslationResult>(),
  comments: Annotation<RuleMigration['comments']>({
    // Translation subgraph causes the original main graph comments to be concatenated again, we need to deduplicate them.
    reducer: (current, value) => uniq(value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
  response: Annotation<string>(),
});
