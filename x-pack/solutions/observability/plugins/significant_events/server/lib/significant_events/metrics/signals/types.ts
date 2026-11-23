/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SignalSchema = 'ecs' | 'otel';
export type SignalComparison = '>' | '>=' | '<' | '==';
export type SignalMetricType = 'gauge' | 'counter' | 'state';

export type SignalSource =
  | {
      kind: 'integration_rule_template';
      integration: string;
      integrationVersion: string;
      ruleTemplateId: string;
      adapted?: string;
    }
  | { kind: 'nightshift_default'; reason: string };

export type SignalFormulaKind =
  | 'average'
  | 'inverse_average'
  | 'container_average'
  | 'matching_value_count'
  | 'minimum'
  | 'maximum'
  | 'error_rate'
  | 'ratio';

interface SignalTemplateVariantBase {
  schema: SignalSchema;
  dataset: string;
  field: string;
  formula: string;
  preAggregationFilter?: string;
  source: SignalSource;
}

export type SignalTemplateVariant = SignalTemplateVariantBase &
  (
    | {
        formulaKind:
          | 'average'
          | 'inverse_average'
          | 'container_average'
          | 'minimum'
          | 'maximum'
          | 'error_rate';
      }
    | { formulaKind: 'matching_value_count'; matchingValues: readonly string[] }
    | { formulaKind: 'ratio'; denominatorField: string }
  );

/** Returns the fields that must have data before a signal variant can run. */
export const getSignalVariantFields = (variant: SignalTemplateVariant): string[] => {
  switch (variant.formulaKind) {
    case 'ratio':
      return [variant.field, variant.denominatorField];
    default:
      return [variant.field];
  }
};

export interface SignalTemplateEntityField {
  name: string;
  fields: readonly string[];
}

export interface SignalTemplateHint {
  comparison: SignalComparison;
  threshold: number;
  window: string;
  min_samples?: number;
  sample_column?: string;
}

export interface SignalTemplate {
  signal: string;
  subtypes: readonly string[];
  metricType: SignalMetricType;
  unit: string;
  contextColumns: readonly string[];
  hint: SignalTemplateHint;
  additionalEntityFields?: readonly SignalTemplateEntityField[];
  variants: readonly SignalTemplateVariant[];
}

/** One schema's contribution to a measurement definition. */
export interface SignalMeasurement {
  schema: SignalSchema;
  dataset: string;
  field: string;
  formula: string;
  source: SignalSource;
}

export interface MeasurementDefinitionHint extends SignalTemplateHint {
  source: SignalSource;
}

export type MeasurementPreviewRow = {
  entity: string;
  minute: string;
  value: number;
} & Record<string, string | number | boolean | null>;

export interface MeasurementDefinitionPreview {
  from: string;
  to: string;
  rows: MeasurementPreviewRow[];
  truncated: boolean;
  error?: string;
}

export interface MeasurementDefinition {
  signal: string;
  type_ki_id: string;
  entity_type: string;
  entity_fields: string[];
  metric_type: SignalMetricType;
  unit: string;
  value_column: 'value';
  context_columns: string[];
  esql: string;
  esql_per_minute: string;
  hint: MeasurementDefinitionHint;
  measurements: SignalMeasurement[];
  preview?: MeasurementDefinitionPreview;
}

export interface SkippedMeasurementDefinition {
  signal: string;
  type_ki_id: string;
  entity_type: string;
  reason: string;
}
