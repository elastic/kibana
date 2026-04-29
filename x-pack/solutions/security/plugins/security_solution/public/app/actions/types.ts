/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext, CellActionFactory } from '@kbn/cell-actions';
import type { RefObject } from 'react';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';
import type { QueryOperator } from '../../../common/types';
export { EsqlInTimelineAction } from './constants';
export interface AndFilter {
  field: string;
  value: string | string[];
  operator?: QueryOperator;
}

export interface SecurityCellActionMetadata extends Record<string, unknown> {
  /**
   * `metadata.scopeId` is used by some actions (e.g. filterIn/Out) to discriminate the Timeline
   * and the DataTables scope (alerts, events, rules preview..) in the actions execution.
   * It is required when cellActions are rendered inside the Timeline or dataTables,
   * it can be omitted otherwise.
   */
  scopeId?: string;
  /**
   * `metadata.isObjectArray` is used to display extended tooltip information
   * for fields that have multiple values
   */
  isObjectArray?: boolean;
  /**
   * `metadata.negateFilters` is used by some actions (e.g. filterIn/Out and addToTimeline) to negate
   * the usual filtering behavior. This is used in special cases where the displayed value is computed
   * and we need all the filtering actions to perform the opposite (negate) operation.
   */
  negateFilters?: boolean;
  /**
   * `metadata.telemetry` is used by the telemetry service to add context to the event.
   */
  telemetry?: {
    /**
     * It defines which UI component renders the CellActions.
     */
    component: string;
  };
  /**
   * `metadata.andFilters` is used by the addToTimelineAction to add
   * an "and" query to the main data provider
   */
  andFilters?: AndFilter[];

  dataViewId?: string;

  /**
   * Ref to the currently visible alerts table
   */
  alertsTableRef?: RefObject<AlertsTableImperativeApi>;
}

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata: SecurityCellActionMetadata | undefined;
}
export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;

export interface SecurityCellActions {
  filterIn: CellActionFactory;
  filterOut: CellActionFactory;
  addToTimeline: CellActionFactory;
  investigateInNewTimeline: CellActionFactory;
  showTopN: CellActionFactory;
  copyToClipboard: CellActionFactory;
  toggleColumn: CellActionFactory;
  toggleUserAssetField: CellActionFactory;
}

// All security cell actions names
export type SecurityCellActionName = keyof SecurityCellActions;

export interface DiscoverCellActions {
  filterIn: CellActionFactory;
  filterOut: CellActionFactory;
  addToTimeline: CellActionFactory;
  copyToClipboard: CellActionFactory;
}

// All Discover search embeddable cell actions names
export type DiscoverCellActionName = keyof DiscoverCellActions;
