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
import { OverviewView } from '../../synthetics/state';

export const getOverviewPanelTitle = () =>
  i18n.translate('xpack.synthetics.monitors.displayName', {
    defaultMessage: 'Synthetics Monitors',
  });

const DEFAULT_FILTERS: MonitorFilters = {
  projects: [],
  tags: [],
  locations: [],
  monitorIds: [],
  monitorTypes: [],
};

export interface OverviewMonitorsEmbeddableCustomState {
  filters?: MonitorFilters;
  view: OverviewView;
}

export type OverviewMonitorsEmbeddableState = SerializedTitles &
  OverviewMonitorsEmbeddableCustomState;

export type StatusOverviewApi = DefaultEmbeddableApi<OverviewMonitorsEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasEditCapabilities;

export const getMonitorsEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: EmbeddableFactory<OverviewMonitorsEmbeddableState, StatusOverviewApi> = {
    type: SYNTHETICS_MONITORS_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const [coreStart, pluginStart] = await getStartServices();

      const titleManager = initializeTitleManager(initialState.rawState);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(initialState.rawState.filters);
      const view$ = new BehaviorSubject(initialState.rawState.view);

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            filters: filters$.getValue(),
            view: view$.getValue(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OverviewMonitorsEmbeddableState>({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, filters$, view$).pipe(
          map(() => undefined)
        ),
        getComparators: () => ({
          ...titleComparators,
          filters: 'referenceEquality',
          view: 'referenceEquality',
        }),
        defaultState: {
          filters: DEFAULT_FILTERS,
        },
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);
          filters$.next(lastSaved?.rawState.filters ?? DEFAULT_FILTERS);
          if (lastSaved?.rawState) view$.next(lastSaved?.rawState.view);
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
                filters: filters$.getValue() || DEFAULT_FILTERS,
                view: view$.getValue(),
              },
              title: i18n.translate(
                'xpack.synthetics.editSyntheticsOverviewEmbeddableTitle.overview.title',
                {
                  defaultMessage: 'Create monitors overview',
                }
              ),
              type: SYNTHETICS_MONITORS_EMBEDDABLE,
            });
            filters$.next(result.filters);
            view$.next(result.view);
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
          const [filters, view] = useBatchedPublishingSubjects(filters$, view$);

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
              <StatusGridComponent
                reload$={reload$}
                filters={filters || DEFAULT_FILTERS}
                view={view}
              />
            </div>
          );
        },
      };
    },
  };
  return factory;
};
