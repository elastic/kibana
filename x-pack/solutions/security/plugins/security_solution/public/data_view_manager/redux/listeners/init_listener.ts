/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { RootState } from '../reducer';
import { sharedDataViewManagerSlice } from '../slices';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../../constants';
import { selectDataViewAsync } from '../actions';

export const createInitListener = (dependencies: { dataViews: DataViewsServicePublic }) => {
  return {
    actionCreator: sharedDataViewManagerSlice.actions.init,
    effect: async (
      _action: AnyAction,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(sharedDataViewManagerSlice.actions.setDataViews(dataViewSpecs));

        // Preload the default data view for related scopes
        // NOTE: we will remove this ideally and load only when particular dataview is necessary
        listenerApi.dispatch(
          selectDataViewAsync({
            id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
            scope: [
              DataViewManagerScopeName.default,
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
