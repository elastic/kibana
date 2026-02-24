/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEmbeddableApi,
  HasDrilldowns,
  SerializedDrilldowns,
} from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext, HasSupportedTriggers } from '@kbn/presentation-publishing';
import type {
  HasEditCapabilities,
  PublishesTitle,
  PublishesWritableTitle,
  SerializedTitles,
} from '@kbn/presentation-publishing';

import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type {
  SingleOverviewCustomState,
  GroupOverviewCustomState,
} from '../../../../common/embeddables/overview/schema';

export type OverviewMode = 'single' | 'groups';
export type GroupBy = 'slo.tags' | 'status' | 'slo.indicator.type';
export interface GroupFilters {
  group_by: GroupBy;
  groups?: string[];
  /** As-code filters for persistence; convert to Filter[] with toStoredFilters for UI (e.g. SearchBar). */
  filters?: AsCodeFilter[];
  kql_query?: string;
}

export interface SloConfigurationProps {
  overview_mode?: OverviewMode;
}

export type SloOverviewState = Partial<SingleOverviewCustomState> &
  Partial<GroupOverviewCustomState>;

export type SloOverviewEmbeddableState = SerializedTitles & SerializedDrilldowns & SloOverviewState;

export type SloOverviewApi = DefaultEmbeddableApi<SloOverviewEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasDrilldowns &
  HasSloGroupOverviewConfig &
  HasEditCapabilities &
  HasSupportedTriggers;

export interface HasSloGroupOverviewConfig {
  getSloGroupOverviewConfig: () => GroupOverviewCustomState;
  updateSloGroupOverviewConfig: (next: GroupOverviewCustomState) => void;
}

export const apiHasSloGroupOverviewConfig = (
  api: unknown | null
): api is HasSloGroupOverviewConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloGroupOverviewConfig).getSloGroupOverviewConfig === 'function' &&
      typeof (api as HasSloGroupOverviewConfig).updateSloGroupOverviewConfig === 'function'
  );
};

export type SloOverviewEmbeddableActionContext = EmbeddableApiContext & {
  embeddable: SloOverviewApi;
};
