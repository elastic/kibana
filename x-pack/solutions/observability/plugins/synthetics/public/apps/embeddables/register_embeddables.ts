/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-browser';

import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { SYNTHETICS_MONITORS_EMBEDDABLE, SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from './constants';

export const registerSyntheticsEmbeddables = (
  core: CoreSetup<ClientPluginsStart, unknown>,
  pluginsSetup: ClientPluginsSetup
) => {
  pluginsSetup.embeddable.registerReactEmbeddableFactory(
    SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
    async () => {
      const { getStatsOverviewEmbeddableFactory } = await import(
        './stats_overview/stats_overview_embeddable_factory'
      );
      return getStatsOverviewEmbeddableFactory(core.getStartServices);
    }
  );

  pluginsSetup.embeddable.registerReactEmbeddableFactory(
    SYNTHETICS_MONITORS_EMBEDDABLE,
    async () => {
      const { getMonitorsEmbeddableFactory } = await import(
        './monitors_overview/monitors_embeddable_factory'
      );
      return getMonitorsEmbeddableFactory(core.getStartServices);
    }
  );
};
