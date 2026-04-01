/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext, HasSupportedTriggers } from '@kbn/presentation-publishing';
import type {
  HasEditCapabilities,
  PublishesTitle,
  PublishesWritableTitle,
} from '@kbn/presentation-publishing';

import type {
  GroupOverviewCustomState,
  OverviewEmbeddableState,
} from '../../../../common/embeddables/overview/types';

export type SloOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> &
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
