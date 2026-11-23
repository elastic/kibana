/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** EBT click `action` values specific to the entity inventory. */
export const ENTITY_INVENTORY_EBT_ACTIONS = {
  OPEN_FILTER: 'openFilter',
  CLEAR_FILTERS: 'clearFilters',
  /** User retries loading the entities after a failed request. */
  RETRY_LOAD: 'retryLoad',
  /** User restores the table's default columns and sort. */
  RESET_TABLE: 'resetTable',
  /** Developer opens or closes the performance overlay flyout (feature-flagged). */
  TOGGLE_PERFORMANCE_OVERLAY: 'togglePerformanceOverlay',
  /** Developer clears the recorded API calls of the performance overlay. */
  CLEAR_PERFORMANCE_HISTORY: 'clearPerformanceHistory',
  /** Developer expands or collapses a probe or query row of the performance overlay. */
  TOGGLE_PERFORMANCE_ROW: 'togglePerformanceRow',
  /** Developer selects a recorded `_list` call to show its breakdown in the performance overlay. */
  SELECT_PERFORMANCE_CALL: 'selectPerformanceCall',
};

/** EBT click `element` values: where in the entity inventory the click happened. */
export const ENTITY_INVENTORY_EBT_ELEMENTS = {
  NO_DATA: 'entityInventoryNoData',
  FILTER_BAR: 'filterBar',
  ENTITY_TABLE: 'entityTable',
  PERFORMANCE_OVERLAY: 'performanceOverlay',
};

export const ENTITY_INVENTORY_EBT_DETAILS = {
  CATEGORY_FILTER: 'category',
  TYPE_FILTER: 'type',
};
