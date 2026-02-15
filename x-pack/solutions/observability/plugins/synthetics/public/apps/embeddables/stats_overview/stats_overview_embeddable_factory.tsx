/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect } from 'react';
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type {
  PublishesWritableTitle,
  PublishesTitle,
  HasEditCapabilities,
  HasSupportedTriggers,
} from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  fetch$,
  titleComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject, map, merge } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import type { ClientPluginsStart } from '../../../plugin';
import { StatsOverviewComponent } from './stats_overview_component';
import { openMonitorConfiguration } from '../common/monitors_open_configuration';
import type {
  MonitorFilters,
  OverviewStatsEmbeddableState,
} from '../../../../common/embeddables/stats_overview/types';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../common/embeddables/stats_overview/constants';

export const getOverviewPanelTitle = () =>
  i18n.translate('xpack.synthetics.statusOverview.list.displayName', {
    defaultMessage: 'Synthetics Stats Overview',
  });

const DEFAULT_FILTERS: MonitorFilters = {
  projects: [],
  tags: [],
  locations: [],
  monitorIds: [],
  monitorTypes: [],
};

export type StatsOverviewApi = DefaultEmbeddableApi<OverviewStatsEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities &
  HasDynamicActions &
  HasSupportedTriggers;

export const getStatsOverviewEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: EmbeddableFactory<OverviewStatsEmbeddableState, StatsOverviewApi> = {
    type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(initialState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(initialState.filters);

      const { embeddableEnhanced } = pluginStart;
      const dynamicActionsManager = await embeddableEnhanced?.initializeEmbeddableDynamicActions(
        uuid,
        () => titleManager.api.title$.getValue(),
        initialState
      );
      const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          filters: filters$.getValue(),
          ...(dynamicActionsManager?.getLatestState() ?? {}),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OverviewStatsEmbeddableState>({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          filters$,
          ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : [])
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          filters: 'referenceEquality',
          ...(dynamicActionsManager?.comparators ?? { drilldowns: 'skip', enhancements: 'skip' }),
        }),
        defaultState: {
          filters: DEFAULT_FILTERS,
        },
        onReset: (lastSaved) => {
          dynamicActionsManager?.reinitializeState(lastSaved ?? {});
          titleManager.reinitializeState(lastSaved);
          filters$.next(lastSaved?.filters ?? DEFAULT_FILTERS);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...(dynamicActionsManager?.api ?? {}),
        ...unsavedChangesApi,
        supportedTriggers: () => [],
        defaultTitle$,
        getTypeDisplayName: () =>
          i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.typeDisplayName', {
            defaultMessage: 'filters',
          }),

        isEditingEnabled: () => true,
        onEdit: async () => {
          try {
            const result = await openMonitorConfiguration({
              coreStart,
              pluginStart,
              initialState: {
                filters: filters$.getValue() || DEFAULT_FILTERS,
              },
              title: i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.title', {
                defaultMessage: 'Create monitor stats',
              }),
              type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
            });
            filters$.next(result.filters);
          } catch (e) {
            return Promise.reject();
          }
        },
        serializeState,
      });

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next.isReload);
        });

      return {
        api,
        Component: () => {
          const [filters] = useBatchedPublishingSubjects(filters$);

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
              maybeStopDynamicActions?.stopDynamicActions();
            };
          }, []);
          return (
            <div
              style={{
                width: '100%',
              }}
              data-shared-item="" // TODO: Remove data-shared-item and data-rendering-count as part of https://github.com/elastic/kibana/issues/179376
            >
              <StatsOverviewComponent reload$={reload$} filters={filters || DEFAULT_FILTERS} />
            </div>
          );
        },
      };
    },
  };
  return factory;
};
