/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  fetch$,
  PublishesWritableTitle,
  PublishesTitle,
  SerializedTitles,
  HasEditCapabilities,
  titleComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { BehaviorSubject, Subject, map, merge } from 'rxjs';
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

interface OverviewState {
  filters: MonitorFilters;
}

export type OverviewEmbeddableState = SerializedTitles & OverviewState;

export type StatusOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities;

const defaultOverviewState: OverviewState = {
  filters: {
    projects: [],
    tags: [],
    monitorIds: [],
    monitorTypes: [],
    locations: [],
  },
};

export const getMonitorsEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: EmbeddableFactory<OverviewEmbeddableState, StatusOverviewApi> = {
    type: SYNTHETICS_MONITORS_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(initialState.rawState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(initialState.rawState.filters);

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            filters: filters$.getValue(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OverviewEmbeddableState>({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, filters$).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          filters: 'referenceEquality',
        }),
        defaultState: defaultOverviewState,
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);
          filters$.next(lastSaved?.rawState.filters ?? defaultOverviewState.filters);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        defaultTitle$,
        getTypeDisplayName: () =>
          i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.typeDisplayName', {
            defaultMessage: 'filters',
          }),
        isEditingEnabled: () => true,
        serializeState,
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
