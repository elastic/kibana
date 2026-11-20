/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';

export type SignalSchema = 'ecs' | 'otel';
export type SignalDirection = 'higher_is_worse' | 'lower_is_worse';
export type SignalComparison = '>' | '>=' | '<' | '==';

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
  | 'container_average'
  | 'restart_delta'
  | 'matching_value_count'
  | 'minimum'
  | 'maximum'
  | 'error_rate'
  | 'ratio'
  | 'oom_killed_count';

interface SignalTemplateVariantBase {
  schema: SignalSchema;
  dataset: string;
  field: string;
  formula: string;
  preAggregationFilter?: string;
  additionalBreakdown?: readonly string[];
  minimumSampleCount?: number;
  direction: SignalDirection;
  comparison: SignalComparison;
  threshold: number;
  source: SignalSource;
}

export type SignalTemplateVariant = SignalTemplateVariantBase &
  (
    | {
        formulaKind:
          | 'average'
          | 'inverse_average'
          | 'container_average'
          | 'restart_delta'
          | 'minimum'
          | 'maximum'
          | 'error_rate';
      }
    | { formulaKind: 'matching_value_count'; matchingValues: readonly string[] }
    | { formulaKind: 'ratio'; denominatorField: string }
    | { formulaKind: 'oom_killed_count'; reasonField: string; reasonValue: string }
  );

/** Returns the fields that must have data before a signal variant can run. */
export const getSignalVariantFields = (variant: SignalTemplateVariant): string[] => {
  switch (variant.formulaKind) {
    case 'ratio':
      return [variant.field, variant.denominatorField];
    case 'oom_killed_count':
      // The reason may be absent until a container terminates; previews nullify unmapped fields.
      return [variant.field];
    default:
      return [variant.field];
  }
};

export interface SignalTemplate {
  signal: string;
  subtypes: readonly string[];
  window: string;
  variants: readonly SignalTemplateVariant[];
}

/** One schema's contribution to a check; several when a check merges schemas per entity. */
export interface SignalMeasurement {
  schema: SignalSchema;
  dataset: string;
  field: string;
  formula: string;
  source: SignalSource;
}

export interface SignalCheck {
  signal: string;
  type_ki_id: string;
  subtype: string;
  measurements: SignalMeasurement[];
  scope?: Condition;
  breakdown: string[];
  window: string;
  direction: SignalDirection;
  comparison: SignalComparison;
  threshold: number;
  esql_preview: string;
}

export interface SkippedSignal {
  signal: string;
  type_ki_id: string;
  subtype: string;
  reason: string;
}
