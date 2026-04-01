/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  monitorOptionSchema,
  monitorFiltersSchema,
  type MonitorOption,
  type MonitorFilters,
} from './common_schemas';

export {
  getStatsOverviewEmbeddableSchema,
  type OverviewStatsEmbeddableState,
  type OverviewStatsEmbeddableCustomState,
} from './synthetics_stats_overview_embeddable_schema';

export {
  syntheticsMonitorsEmbeddableSchema,
  type OverviewMonitorsEmbeddableState,
} from './synthetics_monitors_embeddable_schema';
