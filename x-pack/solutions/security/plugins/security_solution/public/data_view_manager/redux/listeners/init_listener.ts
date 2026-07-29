/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Dispatch, ListenerEffectAPI } from 'redux-toolkit-v1';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { RootState } from '../reducer';
import { sharedDataViewManagerSlice } from '../slices';
import { PageScope } from '../../constants';
import { selectDataViewAsync } from '../actions';
import { createDefaultDataView } from '../../utils/create_default_data_view';
import { createExploreDataView } from '../../utils/create_explore_data_view';
import { getSelectedDataViewStorageKey } from './storage_keys';
import type { DataViewSpec } from '../types';

/**
 * Creates a Redux listener for initializing the Data View Manager state.
 *
 * This listener is responsible for:
 * - Creating and preloading the default, alert, and attack security data views using the provided dependencies.
 * - Fetching all available data views and dispatching them to the store for use in selectors.
 * - Preloading a data view for the `alerts`, `attacks`, `analyzer`, `timeline`, and `default` scopes,
 *   but only for those scopes that have not already been initialized. For each of these scopes the
 *   selection is resolved as follows:
 *   - `attacks` is always preloaded with the dedicated attack data view.
 *   - other scopes use the data view id previously persisted in storage for the active space, if present,
 *     otherwise they fall back to the default data view.
 * - Handling any additional data view selections provided in the action payload (e.g., from URL storage).
 * - Dispatching an error action (and showing a danger toast) if initialization fails.
 *
 * The `explore` scope is handled separately from the main scopes loop. The explore data view is
 * created eagerly so that it appears in data view pickers across the app (e.g. in Timeline), but
 * its creation is wrapped in its own try/catch so that a failure (e.g. `_field_caps` response too
 * large to parse on clusters with many indices) does not surface a modal on unrelated pages such as
 * Alerts. If eager creation fails, `useInitExploreDataView` retries lazily the first time the user
 * navigates to an explore page (Hosts, Users, Network).
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
  notifications: CoreStart['notifications'];
  dataViews: DataViewsServicePublic;
  spaces: SpacesPluginStart;
  storage: Storage;
}) => {
  return {
    actionCreator: sharedDataViewManagerSlice.actions.init,
    effect: async (
      action: ReturnType<typeof sharedDataViewManagerSlice.actions.init>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        const spaceId = (await dependencies.spaces.getActiveSpace()).id;

        // Initialize default data views first
        const { defaultDataView, alertDataView, attackDataView } = await createDefaultDataView({
          application: dependencies.application,
          http: dependencies.http,
        });

        // NOTE: This is later used in the data view manager drop-down selector
        // We're using getIdsWithTitle instead of getAllDataViewLazy because to avoid a bug that happens in the savedObject api where id conflicts can happen between documents
        const dataViews = await dependencies.dataViews.getIdsWithTitle();

        const dataViewSpecs: DataViewSpec[] = dataViews.map((dataView) => ({
          id: dataView.id,
          title: dataView.title,
          name: dataView.name,
          managed: dataView.managed,
          timeFieldName: dataView.timeFieldName,
          type: dataView.type,
          typeMeta: dataView.typeMeta,
        }));

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
          PageScope.alerts,
          PageScope.attacks,
          PageScope.analyzer,
          PageScope.timeline,
          PageScope.default,
          // NOTE: explore scope is omitted from this loop — it is handled separately below.
        ]
          // NOTE: only init default data view for slices that are not initialized yet
          .filter((scope) => !listenerApi.getState().dataViewManager[scope].dataViewId)
          .forEach((scope) => {
            if (scope === PageScope.attacks) {
              return listenerApi.dispatch(
                selectDataViewAsync({
                  id: attackDataView.id,
                  scope,
                })
              );
            }
            const storedDataViewId = dependencies.storage.get(
              getSelectedDataViewStorageKey(spaceId, scope)
            ) as string | null | undefined;
            const state = listenerApi.getState();
            if (
              storedDataViewId &&
              !state.dataViewManager[scope].dataViewId &&
              typeof storedDataViewId === 'string'
            ) {
              return listenerApi.dispatch(
                selectDataViewAsync({
                  id: storedDataViewId,
                  scope,
                })
              );
            } else {
              return listenerApi.dispatch(
                selectDataViewAsync({
                  id: defaultDataView.id,
                  scope,
                })
              );
            }
          });

        // NOTE: if there is a list of data views to preload other than default one (eg. coming in from the url storage)
        action.payload.forEach((defaultSelection) => {
          listenerApi.dispatch(selectDataViewAsync(defaultSelection));
        });

        // Eagerly create the explore data view so it appears in data view pickers across the app
        // (e.g. Timeline's picker). This is intentionally wrapped in its own try/catch so that a
        // failure here — e.g. the _field_caps response is too large to parse on clusters with many
        // indices matching the configured patterns — does not surface an error modal on pages that
        // have no dependency on the explore data view (Alerts, Dashboard, Rules, Cases).
        // If creation fails here, useInitExploreDataView retries lazily the first time the user
        // navigates to an explore page (Hosts, Users, Network), where a failure IS surfaced via
        // a danger toast because the user actually needs the explore data view there.
        if (!listenerApi.getState().dataViewManager.explore.dataViewId) {
          try {
            const exploreDataView = await createExploreDataView(
              { dataViews: dependencies.dataViews, spaces: dependencies.spaces },
              defaultDataView.title.split(','),
              alertDataView.title,
              { skipFetchFields: true }
            );
            listenerApi.dispatch(sharedDataViewManagerSlice.actions.addDataView(exploreDataView));
            listenerApi.dispatch(
              selectDataViewAsync({ id: exploreDataView.id, scope: PageScope.explore })
            );
          } catch {
            // Intentionally swallowed — see comment above.
          }
        }
      } catch (error: unknown) {
        dependencies.notifications.toasts.addDanger({
          title: 'Error initializing data views',
          text: `Error: ${error instanceof Error ? error.message : 'unknown'}`,
        });
        listenerApi.dispatch(sharedDataViewManagerSlice.actions.error());
      }
    },
  };
};
