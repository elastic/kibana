/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';

interface BaseAction {
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface CloneAction extends BaseAction {
  type: 'clone';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface DeleteAction extends BaseAction {
  type: 'delete';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface ResetAction extends BaseAction {
  type: 'reset';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface EnableAction extends BaseAction {
  type: 'enable';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface DisableAction extends BaseAction {
  type: 'disable';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface PurgeRollupAction extends BaseAction {
  type: 'purge_rollup';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

export interface BulkDeleteAction extends BaseAction {
  type: 'bulk_delete';
  items: SLODefinitionResponse[];
}

export interface BulkPurgeRollupAction extends BaseAction {
  type: 'bulk_purge_rollup';
  items: SLODefinitionResponse[];
}

export interface PurgeInstancesAction extends BaseAction {
  type: 'purge_instances';
  items?: SLODefinitionResponse[];
}

export type Action =
  | CloneAction
  | DeleteAction
  | ResetAction
  | EnableAction
  | DisableAction
  | PurgeRollupAction
  | BulkDeleteAction
  | BulkPurgeRollupAction
  | PurgeInstancesAction;
