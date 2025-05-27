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
      _action: AnyAction,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        // Initialize default security data view first
        // Note: this is subject to change, as we might want to add specific data view just for alerts

        // TODO: store this in shared reducer and replace all the uses of constant data view id (DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID)
        // Issue: https://github.com/elastic/security-team/issues/12667
        const { defaultDataView } = await createDefaultDataView({
          dataViewService: dependencies.dataViews,
          uiSettings: dependencies.uiSettings,
          spaces: dependencies.spaces,
          application: dependencies.application,
          http: dependencies.http,
        });

        // NOTE: This is later used in the data view manager drop-down selector
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(sharedDataViewManagerSlice.actions.setDataViews(dataViewSpecs));

        // Preload the default data view for related scopes
        // NOTE: we will remove this ideally and load only when particular dataview is necessary
        listenerApi.dispatch(
          selectDataViewAsync({
            id: defaultDataView.id,
            scope: [
              DataViewManagerScopeName.default,
              DataViewManagerScopeName.detections,
              DataViewManagerScopeName.timeline,
              DataViewManagerScopeName.analyzer,
            ],
          })
        );
      } catch (error: unknown) {
        listenerApi.dispatch(sharedDataViewManagerSlice.actions.error());
      }
    },
  };
};
