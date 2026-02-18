/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/** Re-exported from server (derived from schemas there) */
export type {
  SingleOverviewCustomState,
  GroupOverviewCustomState,
} from '../../../server/lib/embeddables/schema';

export interface LegacySingleOverviewEmbeddableState {
  sloId: string;
  sloInstanceId?: string;
  remoteName?: string;
  overviewMode: 'single';
  showAllGroupByInstances?: boolean;
}

export interface LegacyGroupOverviewEmbeddableState {
  overviewMode: 'groups';
  groupFilters: {
    groupBy: 'slo.tags' | 'status' | 'slo.indicator.type';
    groups?: string[];
    filters?: Filter[];
    kqlQuery?: string;
  };
}
