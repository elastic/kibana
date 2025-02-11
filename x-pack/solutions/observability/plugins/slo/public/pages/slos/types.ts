/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ViewType = 'cardView' | 'listView' | 'compactView';
export type GroupByField =
  | 'ungrouped'
  | 'slo.tags'
  | 'status'
  | 'slo.indicator.type'
  | 'slo.instanceId'
  | '_index'
  | 'slo.id';
export type SortDirection = 'asc' | 'desc';
export type SortField =
  | 'sli_value'
  | 'error_budget_consumed'
  | 'error_budget_remaining'
  | 'status'
  | 'burn_rate_5m'
  | 'burn_rate_1h'
  | 'burn_rate_1d';
