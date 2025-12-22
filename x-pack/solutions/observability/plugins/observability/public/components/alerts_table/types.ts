/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetOptional } from 'type-fest';
import type { AlertsTablePropsWithRef } from '@kbn/response-ops-alerts-table/types';

// Using a generic with `any` default allows this interface to accept
// registries with formatters that expect specific field types (like ParsedTechnicalFields)
// without requiring type assertions at the call site.

/** Nullable number type matching the observability plugin's Maybe<number> */
type MaybeNumber = number | null | undefined;

/**
 * Formatter function that takes a nullable number value and returns a formatted string.
 * Additional options parameters vary by implementation (e.g., FormatterOptions for asDuration).
 */
type ValueFormatter = (value: MaybeNumber, ...options: any[]) => string;

export interface ObservabilityRuleTypeRegistry<TFields = any> {
  getFormatter: (ruleTypeId: string) =>
    | ((params: {
        fields: TFields;
        formatters: {
          asDuration: ValueFormatter;
          asPercent: ValueFormatter;
        };
      }) => { link?: string; reason?: string; hasBasePath?: boolean })
    | undefined;
}

export interface ConfigSchema {
  unsafe?: {
    alertDetails?: {
      logs?: { enabled: boolean };
      uptime?: { enabled: boolean };
      observability?: { enabled: boolean };
    };
    thresholdRule?: { enabled: boolean };
    ruleFormV2?: { enabled: boolean };
  };
}

export interface TopAlert {
  fields: Record<string, unknown>;
  active: boolean;
  start: number;
  lastUpdated: number;
  link?: string;
  reason: string;
  hasBasePath?: boolean;
}

export interface ObservabilityAlertsTableContext {
  observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry;
  config?: ConfigSchema;
  parentAlert?: TopAlert;
}

export type ObservabilityAlertsTableProps = SetOptional<
  AlertsTablePropsWithRef<ObservabilityAlertsTableContext>,
  'ruleTypeIds'
>;

export type GetObservabilityAlertsTableProp<PropKey extends keyof ObservabilityAlertsTableProps> =
  NonNullable<ObservabilityAlertsTableProps[PropKey]>;

export interface BucketItem {
  key: string;
  doc_count: number;
}

export interface AlertsByGroupingAgg extends Record<string, unknown> {
  groupByFields: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
  ruleTags: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
  rulesCountAggregation?: {
    value: number;
  };
  sourceCountAggregation?: {
    value: number;
  };
  groupsCount: {
    value: number;
  };
  unitsCount: {
    value: number;
  };
}

