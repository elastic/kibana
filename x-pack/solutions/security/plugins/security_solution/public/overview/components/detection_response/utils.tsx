/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SEVERITY_COLOR = {
  critical: '#E7664C',
  high: '#DA8B45',
  medium: '#D6BF57',
  low: '#54B399',
} as const;

export const ITEMS_PER_PAGE = 4;
const MAX_ALLOWED_RESULTS = 100;

/**
 * While there could be more than 100 hosts or users we only want to show 25 pages of results,
 * and the host count cardinality result will always be the total count
 * */
export const getPageCount = (count: number = 0) =>
  Math.ceil(Math.min(count || 0, MAX_ALLOWED_RESULTS) / ITEMS_PER_PAGE);

export const openAlertsFilter = { field: 'kibana.alert.workflow_status', value: 'open' };
