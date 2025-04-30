/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect } from 'react';
import { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  fetch$,
  PublishesWritableTitle,
  PublishesTitle,
  SerializedTitles,
  HasEditCapabilities,
  HasSupportedTriggers,
  titleComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { BehaviorSubject, Observable, Subject, map, merge } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import {
  DynamicActionsSerializedState,
  EmbeddableDynamicActionsManager,
} from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import { MonitorFilters } from '../monitors_overview/types';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../constants';
import { ClientPluginsStart } from '../../../plugin';
import { StatsOverviewComponent } from './stats_overview_component';
import { openMonitorConfiguration } from '../common/monitors_open_configuration';

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

export interface OverviewStatsEmbeddableCustomState {
  filters?: MonitorFilters;
}

export type OverviewStatsEmbeddableState = SerializedTitles &
  DynamicActionsSerializedState &
  OverviewStatsEmbeddableCustomState;

export type StatsOverviewApi = DefaultEmbeddableApi<OverviewStatsEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities &
  HasDynamicActions &
  HasSupportedTriggers;

type DynamicActionsData = {
  serializedDynamicActions: DynamicActionsSerializedState;
  stopDynamicActions?: () => void;
} & Pick<
  EmbeddableDynamicActionsManager,
  'anyStateChange$' | 'api' | 'comparators' | 'reinitializeState'
>;

const defaultOverviewState: OverviewState = {
  filters: DEFAULT_FILTERS;

const getDynamicActionsData = (
  extractor?: () => EmbeddableDynamicActionsManager
): DynamicActionsData => {
  if (extractor) {
    const {
      getLatestState,
      startDynamicActions,
      api,
      comparators,
      anyStateChange$,
      reinitializeState,
    } = extractor();
    return {
      serializedDynamicActions: getLatestState(),
      stopDynamicActions: startDynamicActions().stopDynamicActions,
      api,
      comparators,
      anyStateChange$,
      reinitializeState,
    };
  }

  return {
    serializedDynamicActions: {},
    stopDynamicActions: undefined,
    api: {},
    anyStateChange$: new Observable<void>(),
    comparators: {
      enhancements: 'skip',
    },
    reinitializeState: () => {},
  };
};

export const getStatsOverviewEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: EmbeddableFactory<OverviewStatsEmbeddableState, StatsOverviewApi> = {
    type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(initialState.rawState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(initialState.rawState.filters);

      const { embeddableEnhanced } = pluginStart;
      const {
        api: dynamicActionsApi,
        comparators: dynamicActionsComparator,
        serializedDynamicActions,
        anyStateChange$: dynamicActionsAnyStateChange$,
        reinitializeState: dynamicActionsReinitializeState,
        stopDynamicActions,
      } = getDynamicActionsData(
        embeddableEnhanced
          ? () =>
              embeddableEnhanced.initializeEmbeddableDynamicActions(
                uuid,
                () => titleManager.api.title$.getValue(),
                initialState.rawState
              )
          : undefined
      );

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            filters: filters$.getValue(),
            ...serializedDynamicActions,
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OverviewEmbeddableState>({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          filters$,
          dynamicActionsAnyStateChange$
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          filters: 'referenceEquality',
          ...dynamicActionsComparator,
        }),
        defaultState: defaultOverviewState,
        onReset: (lastSaved) => {
          dynamicActionsReinitializeState(lastSaved?.rawState ?? {});
          titleManager.reinitializeState(lastSaved?.rawState);
          filters$.next(lastSaved?.rawState.filters ?? defaultOverviewState.filters);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...dynamicActionsApi,
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
                filters: filters$.getValue()|| DEFAULT_FILTERS,
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
              if (stopDynamicActions) stopDynamicActions();
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
