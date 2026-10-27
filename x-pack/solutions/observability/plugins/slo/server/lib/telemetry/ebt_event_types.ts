/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLO_CREATED_EBT_EVENT_TYPE = 'slo_created' as const;
export const SLO_UPDATED_EBT_EVENT_TYPE = 'slo_updated' as const;
export const SLO_DELETED_EBT_EVENT_TYPE = 'slo_deleted' as const;
export const SLO_RESET_EBT_EVENT_TYPE = 'slo_reset' as const;
export const SLO_BULK_DELETED_EBT_EVENT_TYPE = 'slo_bulk_deleted' as const;
export const SLO_ROLLUP_DATA_PURGED_EBT_EVENT_TYPE = 'slo_rollup_data_purged' as const;

export const SLO_CHANGED_FIELDS = [
  'name',
  'description',
  'indicator',
  'timeWindow',
  'budgetingMethod',
  'objective',
  'settings',
  'tags',
  'groupBy',
  'artifacts',
] as const;

export type SloChangedField = (typeof SLO_CHANGED_FIELDS)[number];

export interface SloDefinitionEbtData {
  slo_id: string;
  revision: number;
  indicator_type: string;
  budgeting_method: string;
  time_window_type: string;
  time_window_duration: string;
  objective_target: number;
  timeslice_target?: number;
  timeslice_window?: string;
  group_by_count: number;
  tags_count: number;
  dashboards_count: number;
  enabled: boolean;
  created_at: string;
  settings: {
    sync_delay: string;
    frequency: string;
    prevent_initial_backfill: boolean;
    has_sync_field: boolean;
    has_project_routing: boolean;
  };
}

export interface SloUpdatedEbtData extends SloDefinitionEbtData {
  revision_bumped: boolean;
  changed_fields: SloChangedField[];
}

export interface SloDeletedEbtData extends SloDefinitionEbtData {
  bulk: boolean;
}

export interface SloBulkDeletedEbtData {
  requested_count: number;
  succeeded_count: number;
  failed_count: number;
}

export interface SloRollupDataPurgedEbtData {
  slo_count: number;
  purge_policy_type: 'fixed_age' | 'fixed_time';
  force: boolean;
}

export interface SloEbtEventMap {
  [SLO_CREATED_EBT_EVENT_TYPE]: SloDefinitionEbtData;
  [SLO_UPDATED_EBT_EVENT_TYPE]: SloUpdatedEbtData;
  [SLO_DELETED_EBT_EVENT_TYPE]: SloDeletedEbtData;
  [SLO_RESET_EBT_EVENT_TYPE]: SloDefinitionEbtData;
  [SLO_BULK_DELETED_EBT_EVENT_TYPE]: SloBulkDeletedEbtData;
  [SLO_ROLLUP_DATA_PURGED_EBT_EVENT_TYPE]: SloRollupDataPurgedEbtData;
}

export type SloEbtEventType = keyof SloEbtEventMap;
