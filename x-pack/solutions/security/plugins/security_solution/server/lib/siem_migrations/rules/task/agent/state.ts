/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import { uniq } from 'lodash/fp';
import type { RuleTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type {
  ElasticRulePartial,
  OriginalRule,
  RuleMigrationRule,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationResources } from '../retrievers/rule_resource_retriever';

export const migrateRuleState = Annotation.Root({
  original_rule: Annotation<OriginalRule>(),
  resources: Annotation<RuleMigrationResources>(),
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
  comments: Annotation<RuleMigrationRule['comments']>({
    // Translation subgraph causes the original main graph comments to be concatenated again, we need to deduplicate them.
    reducer: (current, value) => uniq(value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

export const migrateRuleConfigSchema = Annotation.Root({
  skipPrebuiltRulesMatching: Annotation<boolean | undefined>(),
});
