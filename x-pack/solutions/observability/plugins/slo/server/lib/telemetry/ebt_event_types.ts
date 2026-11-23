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
  indicator_type: string;
  budgeting_method: string;
  time_window_type: string;
  grouped: boolean;
}

export interface SloUpdatedEbtData extends SloDefinitionEbtData {
  revision_bumped: boolean;
  changed_fields: SloChangedField[];
}

export interface SloDeletedEbtData extends SloDefinitionEbtData {
  bulk: boolean;
}

export const COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE = 'composite_slo_created' as const;
export const COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE = 'composite_slo_updated' as const;
export const COMPOSITE_SLO_DELETED_EBT_EVENT_TYPE = 'composite_slo_deleted' as const;

export const COMPOSITE_SLO_CHANGED_FIELDS = [
  'name',
  'description',
  'members',
  'compositeMethod',
  'timeWindow',
  'budgetingMethod',
  'objective',
  'tags',
  'enabled',
] as const;

export type CompositeSloChangedField = (typeof COMPOSITE_SLO_CHANGED_FIELDS)[number];

export interface CompositeSloDeletedEbtData {
  composite_slo_id: string;
}

export interface CompositeSloDefinitionEbtData extends CompositeSloDeletedEbtData {
  members_count: number;
  members_with_instance_id_count: number;
}

export interface CompositeSloUpdatedEbtData extends CompositeSloDefinitionEbtData {
  changed_fields: CompositeSloChangedField[];
}

export interface SloEbtEventMap {
  [SLO_CREATED_EBT_EVENT_TYPE]: SloDefinitionEbtData;
  [SLO_UPDATED_EBT_EVENT_TYPE]: SloUpdatedEbtData;
  [SLO_DELETED_EBT_EVENT_TYPE]: SloDeletedEbtData;
  [SLO_RESET_EBT_EVENT_TYPE]: SloDefinitionEbtData;
  [COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE]: CompositeSloDefinitionEbtData;
  [COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE]: CompositeSloUpdatedEbtData;
  [COMPOSITE_SLO_DELETED_EBT_EVENT_TYPE]: CompositeSloDeletedEbtData;
}

export type SloEbtEventType = keyof SloEbtEventMap;
