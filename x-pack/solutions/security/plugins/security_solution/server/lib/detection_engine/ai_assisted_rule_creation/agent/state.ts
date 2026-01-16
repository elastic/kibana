/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { EsqlRule } from '../../../../../common/api/detection_engine/model/rule_schema';

export interface KnowledgeBaseDocument {
  id: string;
  text: string;
  name: string;
}

const defaultRuleValues: Partial<EsqlRule> = {
  references: [],
  severity_mapping: [],
  risk_score_mapping: [],
  related_integrations: [],
  required_fields: [],
  actions: [],
  exceptions_list: [],
  false_positives: [],
  author: [],
  setup: '',
  max_signals: 100,
  risk_score: 21,
  severity: 'low',
  interval: '5m',
  from: 'now-6m',
  to: 'now',
  tags: [],
  threat: [],
};

export const RuleCreationAnnotation = Annotation.Root({
  userQuery: Annotation<string>(),
  rule: Annotation<Partial<EsqlRule>>({
    default: () => defaultRuleValues,
    reducer: (current, update) => {
      return { ...current, ...update };
    },
  }),
  errors: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => {
      return [...current, ...update];
    },
  }),
  warnings: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => {
      return [...current, ...update];
    },
  }),
});

export type RuleCreationState = typeof RuleCreationAnnotation.State;
