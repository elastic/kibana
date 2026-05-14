/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { EsqlRuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleSchedule } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';

// INCOHERENT and NOT_SECURITY_RELEVANT are reserved for a future pre-flight classifier node.
// They are defined here so the type is stable, but no node emits them yet.
export type RejectionCode = 'NO_DATA' | 'INCOHERENT' | 'NOT_SECURITY_RELEVANT' | 'INVALID_OUTPUT';

export interface RejectionReason {
  code: RejectionCode;
  message: string;
  details?: string;
}

export const defaultSchedule: RuleSchedule = {
  interval: '5m',
  from: 'now-6m',
  to: 'now',
};

const defaultRuleValues: Partial<EsqlRuleCreateProps> = {
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
  tags: [],
  threat: [],
  ...defaultSchedule,
};

export const RuleCreationAnnotation = Annotation.Root({
  userQuery: Annotation<string>(),
  rule: Annotation<Partial<EsqlRuleCreateProps>>({
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
  rejectionReason: Annotation<RejectionReason | undefined>({
    default: () => undefined,
    reducer: (current, update) => update ?? current,
  }),
  rejectionMessage: Annotation<string | undefined>({
    default: () => undefined,
    reducer: (current, update) => update ?? current,
  }),
});

export type RuleCreationState = typeof RuleCreationAnnotation.State;
