/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';

export type SignalSchema = 'ecs' | 'otel';
export type SignalDirection = 'higher_is_worse' | 'lower_is_worse';
export type SignalComparison = '>' | '>=' | '==';

export type SignalSource =
  | {
      kind: 'integration_rule_template';
      integration: string;
      integrationVersion: string;
      ruleTemplateId: string;
      adapted?: string;
    }
  | { kind: 'nightshift_default'; reason: string }
  | { kind: 'undecided'; reason: string };

export type SignalFormulaKind =
  | 'average'
  | 'inverse_average'
  | 'restart_delta'
  | 'not_ready_count'
  | 'minimum'
  | 'error_rate';

export interface SignalTemplateVariant {
  schema: SignalSchema;
  dataset: string;
  field: string;
  formula: string;
  formulaKind: SignalFormulaKind;
  preAggregationFilter?: string;
  additionalBreakdown?: readonly string[];
  minimumSampleCount?: number;
  direction: SignalDirection;
  comparison: SignalComparison;
  threshold: number;
  source: SignalSource;
}

export interface SignalTemplate {
  signal: string;
  subtypes: readonly string[];
  window: string;
  variants: readonly SignalTemplateVariant[];
}

export interface SignalCheck {
  signal: string;
  type_ki_id: string;
  subtype: string;
  schema: SignalSchema;
  dataset: string;
  field: string;
  scope?: Condition;
  breakdown: string[];
  formula: string;
  window: string;
  direction: SignalDirection;
  threshold: number;
  source: SignalSource;
  esql_preview: string;
}

export interface SkippedSignal {
  signal: string;
  type_ki_id: string;
  subtype: string;
  reason: string;
}
