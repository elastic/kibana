/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export schema-derived types from server for use in common and public
export type {
  MonitorOption,
  MonitorFilters,
  LegacyMonitorFilters,
  SyntheticsStatsOverviewEmbeddableState,
  SyntheticsMonitorsEmbeddableState,
} from '../server/schemas';
