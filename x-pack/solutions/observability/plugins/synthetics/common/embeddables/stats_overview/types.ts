/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';

export type {
  MonitorFilters,
  SyntheticsStatsOverviewEmbeddableState as OverviewStatsEmbeddableStateBase,
} from '../../types';
import type {
  MonitorFilters,
  SyntheticsStatsOverviewEmbeddableState as OverviewStatsEmbeddableStateBase,
} from '../../types';

export interface OverviewStatsEmbeddableCustomState {
  filters?: MonitorFilters;
}

export type OverviewStatsEmbeddableState = OverviewStatsEmbeddableStateBase &
  DynamicActionsSerializedState;
