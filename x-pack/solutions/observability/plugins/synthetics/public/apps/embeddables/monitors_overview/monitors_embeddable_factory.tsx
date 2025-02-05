/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  fetch$,
  PublishesWritableTitle,
  PublishesTitle,
  SerializedTitles,
  HasEditCapabilities,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { MonitorFilters } from './types';
import { StatusGridComponent } from './monitors_grid_component';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../constants';
import { ClientPluginsStart } from '../../../plugin';
import { openMonitorConfiguration } from '../common/monitors_open_configuration';

export const getOverviewPanelTitle = () =>
  i18n.translate('xpack.synthetics.monitors.displayName', {
    defaultMessage: 'Synthetics Monitors',
  });

export type OverviewEmbeddableState = SerializedTitles & {
  filters: MonitorFilters;
};

export type StatusOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities;

export const getMonitorsEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: ReactEmbeddableFactory<
    OverviewEmbeddableState,
    OverviewEmbeddableState,
    StatusOverviewApi
  > = {
    type: SYNTHETICS_MONITORS_EMBEDDABLE,
    deserializeState: (state) => {
      return state.rawState as OverviewEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(state.filters);

      const api = buildApi(
        {
          ...titleManager.api,
          defaultTitle$,
          getTypeDisplayName: () =>
            i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.typeDisplayName', {
              defaultMessage: 'filters',
            }),
          isEditingEnabled: () => true,
          serializeState: () => {
            return {
              rawState: {
                ...titleManager.serialize(),
                filters: filters$.getValue(),
              },
            };
          },
          onEdit: async () => {
            try {
              const result = await openMonitorConfiguration({
                coreStart,
                pluginStart,
                initialState: {
                  filters: filters$.getValue(),
                },
                title: i18n.translate(
                  'xpack.synthetics.editSyntheticsOverviewEmbeddableTitle.overview.title',
                  {
                    defaultMessage: 'Create monitors overview',
                  }
                ),
              });
              filters$.next(result.filters);
            } catch (e) {
              return Promise.reject();
            }
          },
        },
        {
          ...titleManager.comparators,
          filters: [filters$, (value) => filters$.next(value)],
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
            };
          }, []);
          return (
            <div
              style={{
                width: '100%',
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
              data-shared-item="" // TODO: Remove data-shared-item and data-rendering-count as part of https://github.com/elastic/kibana/issues/179376
            >
              <StatusGridComponent reload$={reload$} filters={filters} />
            </div>
          );
        },
      };
    },
  };
  return factory;
};
