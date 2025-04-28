/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect } from 'react';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  fetch$,
  PublishesWritableTitle,
  PublishesTitle,
  SerializedTitles,
  HasEditCapabilities,
  getUnchangingComparator,
  HasSupportedTriggers,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import {
  DynamicActionsSerializedState,
  ReactEmbeddableDynamicActionsApi,
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

export type OverviewEmbeddableState = SerializedTitles &
  DynamicActionsSerializedState & {
    filters: MonitorFilters;
  };

export type StatsOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities &
  HasDynamicActions &
  HasSupportedTriggers;

type DynamicActionsData = {
  serializedDynamicActions: DynamicActionsSerializedState;
  stopDynamicActions?: () => void;
} & Pick<ReactEmbeddableDynamicActionsApi, 'dynamicActionsApi' | 'dynamicActionsComparator'>;

const getDynamicActionsData = (
  extractor?: () => ReactEmbeddableDynamicActionsApi
): DynamicActionsData => {
  if (extractor) {
    const {
      serializeDynamicActions,
      startDynamicActions,
      dynamicActionsApi,
      dynamicActionsComparator,
    } = extractor();
    return {
      serializedDynamicActions: serializeDynamicActions(),
      stopDynamicActions: startDynamicActions().stopDynamicActions,
      dynamicActionsApi,
      dynamicActionsComparator,
    };
  }

  return {
    serializedDynamicActions: {},
    stopDynamicActions: undefined,
    dynamicActionsApi: {},
    dynamicActionsComparator: {
      enhancements: getUnchangingComparator(),
    },
  };
};

export const getStatsOverviewEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: ReactEmbeddableFactory<
    OverviewEmbeddableState,
    OverviewEmbeddableState,
    StatsOverviewApi
  > = {
    type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
    deserializeState: (state) => {
      return state.rawState as OverviewEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(state.filters);

      const { embeddableEnhanced } = pluginStart;
      const {
        dynamicActionsApi,
        dynamicActionsComparator,
        serializedDynamicActions,
        stopDynamicActions,
      } = getDynamicActionsData(
        embeddableEnhanced
          ? () =>
              embeddableEnhanced.initializeReactEmbeddableDynamicActions(
                uuid,
                () => titleManager.api.title$.getValue(),
                state
              )
          : undefined
      );

      const api = buildApi(
        {
          ...titleManager.api,
          ...dynamicActionsApi,
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
                  filters: filters$.getValue(),
                },
                title: i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.title', {
                  defaultMessage: 'Create monitor stats',
                }),
              });
              filters$.next(result.filters);
            } catch (e) {
              return Promise.reject();
            }
          },
          serializeState: () => {
            return {
              rawState: {
                ...titleManager.serialize(),
                filters: filters$.getValue(),
                ...serializedDynamicActions,
              },
            };
          },
        },
        {
          ...titleManager.comparators,
          filters: [filters$, (value) => filters$.next(value)],
          ...dynamicActionsComparator,
        }
      );

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
              <StatsOverviewComponent reload$={reload$} filters={filters} />
            </div>
          );
        },
      };
    },
  };
  return factory;
};
