/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID = 'security-solution-default';

export const SLICE_PREFIX = 'x-pack/security_solution/dataViewManager' as const;

/**
 * This helps developers use the dataview that is set by default in the page corresponding to the scope.
 *
 * For example, if from a random page I want to use the dataview used in the alerts page,
 * I can use the @link{useDataView} hook with the PageScope.alerts to get it.
 */
export enum PageScope {
  default = 'default',
  alerts = 'alerts',
  attacks = 'attacks',
  timeline = 'timeline',
  analyzer = 'analyzer',
  explore = 'explore',
}
