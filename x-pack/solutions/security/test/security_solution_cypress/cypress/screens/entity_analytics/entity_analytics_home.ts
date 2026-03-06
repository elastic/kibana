/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PAGE_TITLE = '[data-test-subj="entityAnalyticsHomePage"]';
export const COMBINED_RISK_DONUT_CHART = '[data-test-subj="risk-score-donut-chart"]';
export const ANOMALIES_PLACEHOLDER_PANEL = '[data-test-subj="recent-anomalies-panel"]';
// The table wrapper can be in loading-true or loading-false state
export const ENTITIES_TABLE = '[data-test-subj*="entity-analytics-home-entities-table-loading"]';
// Table when fully loaded (no longer loading)
export const ENTITIES_TABLE_LOADED =
  '[data-test-subj="entity-analytics-home-entities-table-loading-false"]';
export const TIMELINE_ICON = '[data-test-subj="entity-analytics-home-timeline-icon"]';
