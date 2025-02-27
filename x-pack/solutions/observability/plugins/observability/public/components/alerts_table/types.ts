/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SetOptional } from 'type-fest';
import type { AlertsTablePropsWithRef } from '@kbn/response-ops-alerts-table/types';
import type { ConfigSchema, ObservabilityRuleTypeRegistry } from '../..';

export interface ObservabilityAlertsTableContext {
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  config: ConfigSchema;
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
