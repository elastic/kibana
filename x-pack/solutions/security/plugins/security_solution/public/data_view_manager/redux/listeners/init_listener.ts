/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { RootState } from '../reducer';
import { sharedDataViewManagerSlice } from '../slices';
import { DataViewManagerScopeName } from '../../constants';
import { selectDataViewAsync } from '../actions';
import { createDefaultDataView } from '../../utils/create_default_data_view';
import { createExploreDataView } from '../../utils/create_explore_data_view';

/**
 * Creates a Redux listener for initializing the Data View Manager state.
 *
 * This listener is responsible for:
 * - Creating and preloading the default security data view using the provided dependencies.
 * - Fetching all available data views and dispatching them to the store for use in selectors.
 * - Preloading the default data view for all defined scopes (detections, analyzer, timeline, default),
 *   but only for those scopes that have not already been initialized.
 * - Handling any additional data view selections provided in the action payload (e.g., from URL storage).
 * - Dispatching an error action if initialization fails.
 *
 * The listener ensures that race conditions are avoided by only initializing scopes that are not already set,
 * and that state is not reset for slices that already have selections.
 *
 * @param dependencies - Core and plugin services required for data view creation and retrieval.
 * @returns An object with the actionCreator and effect for Redux listener middleware.
 */
export const createInitListener = (dependencies: {
  http: CoreStart['http'];
  application: CoreStart['application'];
  uiSettings: CoreStart['uiSettings'];
  dataViews: DataViewsServicePublic;
  spaces: SpacesPluginStart;
}) => {
  return {
    actionCreator: sharedDataViewManagerSlice.actions.init,
    effect: async (
      action: ReturnType<typeof sharedDataViewManagerSlice.actions.init>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        // Initialize default data views first
        const { defaultDataView, alertDataView } = await createDefaultDataView({
          dataViewService: dependencies.dataViews,
          uiSettings: dependencies.uiSettings,
          spaces: dependencies.spaces,
          application: dependencies.application,
          http: dependencies.http,
        });

        const exploreDataView = await createExploreDataView(
          {
            dataViews: dependencies.dataViews,
            spaces: dependencies.spaces,
          },
          defaultDataView.title.split(','),
          alertDataView.title
        );

        listenerApi.dispatch(sharedDataViewManagerSlice.actions.addDataView(exploreDataView));

        // NOTE: This is later used in the data view manager drop-down selector
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(sharedDataViewManagerSlice.actions.setDataViews(dataViewSpecs));

        // NOTE: save default dataview id for the given space in the store.
        // this is used to identify the default selection in pickers across Kibana Space
        listenerApi.dispatch(
          sharedDataViewManagerSlice.actions.setDataViewId({
            defaultDataViewId: defaultDataView.id,
            alertDataViewId: alertDataView.id,
          })
        );

        // Preload the default data view for all the scopes
        // Immediate calls that would dispatch this call from other places will cancel this action,
        // preventing race conditions
        // Whats more, portions of the state that already have selections applied to them will not be reset in the init listener.
        [
          DataViewManagerScopeName.detections,
          DataViewManagerScopeName.analyzer,
          DataViewManagerScopeName.timeline,
          DataViewManagerScopeName.default,
          DataViewManagerScopeName.explore,
        ]
          // NOTE: only init default data view for slices that are not initialized yet
          .filter((scope) => !listenerApi.getState().dataViewManager[scope].dataViewId)
          .forEach((scope) => {
            if (scope === DataViewManagerScopeName.detections) {
              return listenerApi.dispatch(
                selectDataViewAsync({
                  id: alertDataView.id,
                  scope,
                })
              );
            }

            if (scope === DataViewManagerScopeName.explore) {
              return listenerApi.dispatch(
                selectDataViewAsync({
                  id: exploreDataView.id,
                  scope,
                })
              );
            }

            listenerApi.dispatch(
              selectDataViewAsync({
                id: defaultDataView.id,
                scope,
              })
            );
          });

        // NOTE: if there is a list of data views to preload other than default one (eg. coming in from the url storage)
        action.payload.forEach((defaultSelection) => {
          listenerApi.dispatch(selectDataViewAsync(defaultSelection));
        });
      } catch (error: unknown) {
        listenerApi.dispatch(sharedDataViewManagerSlice.actions.error());
      }
    },
  };
};
