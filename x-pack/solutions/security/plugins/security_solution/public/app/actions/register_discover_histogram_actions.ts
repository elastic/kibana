/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { History } from 'history';
import type { CoreSetup } from '@kbn/core/public';
import type { SecurityAppStore } from '../../common/store';
import type { StartServices } from '../../types';
import { EsqlInTimelineTrigger, EsqlInTimelineAction } from './constants';

const createDiscoverHistogramCustomFilterAction = async (
  _store: SecurityAppStore,
  _history: History,
  coreSetup: CoreSetup,
  services: StartServices
) => {
  const [coreStart] = await coreSetup.getStartServices();
  const histogramApplyFilter = await createFilterAction(
    services.customDataService.query.filterManager,
    services.customDataService.query.timefilter.timefilter,
    coreStart,
    EsqlInTimelineAction.VIS_FILTER_ACTION,
    EsqlInTimelineAction.VIS_FILTER_ACTION
  );

  services.uiActions.registerActionAsync(histogramApplyFilter.id, async () => histogramApplyFilter);

  return histogramApplyFilter;
};

const createDiscoverHistogramCustomTrigger = (
  _store: SecurityAppStore,
  _history: History,
  services: StartServices
) => {
  services.uiActions.registerTrigger({
    id: EsqlInTimelineTrigger.HISTOGRAM_TRIGGER,
  });
};

export const registerDiscoverHistogramActions = async (
  store: SecurityAppStore,
  history: History,
  coreSetup: CoreSetup,
  services: StartServices
) => {
  createDiscoverHistogramCustomTrigger(store, history, services);

  // Register the action factory, not the action itself
  services.uiActions.registerActionAsync(EsqlInTimelineAction.VIS_FILTER_ACTION, async () => {
    const [coreStart] = await coreSetup.getStartServices();
    const { createFilterAction } = await import('@kbn/unified-search-plugin/public');

    return createFilterAction(
      services.customDataService.query.filterManager,
      services.customDataService.query.timefilter.timefilter,
      coreStart,
      EsqlInTimelineAction.VIS_FILTER_ACTION,
      EsqlInTimelineAction.VIS_FILTER_ACTION
    );
  });

  services.uiActions.attachAction(
    EsqlInTimelineTrigger.HISTOGRAM_TRIGGER,
    EsqlInTimelineAction.VIS_FILTER_ACTION
  );
};
