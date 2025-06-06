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
      action: ReturnType<typeof sharedDataViewManagerSlice.actions.init>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        // NOTE: This is later used in the data view manager drop-down selector
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(sharedDataViewManagerSlice.actions.setDataViews(dataViewSpecs));

        // Preload the default data view for all the scopes
        // Immediate calls that would dispatch this call from other places will cancel this action,
        // preventing race conditions
        [
          DataViewManagerScopeName.detections,
          DataViewManagerScopeName.analyzer,
          DataViewManagerScopeName.timeline,
          DataViewManagerScopeName.default,
        ].forEach((scope) => {
          listenerApi.dispatch(
            selectDataViewAsync({
              id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
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
