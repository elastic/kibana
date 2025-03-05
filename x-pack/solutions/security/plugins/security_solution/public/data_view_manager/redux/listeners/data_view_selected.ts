/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { RootState } from '../reducer';
import { scopes } from '../reducer';
import { selectDataViewAsync } from '../actions';
import { sharedDataViewManagerSlice } from '../slices';

export const createDataViewSelectedListener = (dependencies: {
  dataViews: DataViewsServicePublic;
}) => {
  return {
    actionCreator: selectDataViewAsync,
    effect: async (
      action: ReturnType<typeof selectDataViewAsync>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      let dataViewByIdError: unknown;
      let adhocDataViewCreationError: unknown;
      let dataViewById: DataView | null = null;
      let adHocDataView: DataView | null = null;

      const state = listenerApi.getState();

      const findCachedDataView = (id: string | null | undefined) => {
        if (!id) {
          return null;
        }

        const cachedAdHocDataView =
          state.dataViewManager.shared.adhocDataViews.find((dv) => dv.id === id) ?? null;

        const cachedPersistedDataView =
          state.dataViewManager.shared.dataViews.find((dv) => dv.id === id) ?? null;

        const cachedDataView = cachedAdHocDataView || cachedPersistedDataView;

        // NOTE: validate if fields are available, otherwise dont return the view
        // This is required to compute browserFields later.
        // If the view is not returned here, it will be fetched further down this file, and that
        // should return the full data view.
        if (!Object.keys(cachedDataView?.fields || {}).length) {
          return null;
        }

        return cachedDataView;
      };

      /**
       * Try to locate the data view in cached entries first
       */
      const cachedDataViewSpec = findCachedDataView(action.payload.id);

      if (!cachedDataViewSpec) {
        try {
          if (action.payload.id) {
            dataViewById = await dependencies.dataViews.get(action.payload.id);
          }
        } catch (error: unknown) {
          dataViewByIdError = error;
        }
      }

      if (!dataViewById) {
        try {
          const title = action.payload.fallbackPatterns?.join(',') ?? '';
          if (!title.length) {
            throw new Error('empty adhoc title field');
          }

          adHocDataView = await dependencies.dataViews.create({
            id: `adhoc_${title}`,
            title,
          });
          if (adHocDataView) {
            listenerApi.dispatch(sharedDataViewManagerSlice.actions.addDataView(adHocDataView));
          }
        } catch (error: unknown) {
          adhocDataViewCreationError = error;
        }
      }

      const resolvedSpecToUse =
        cachedDataViewSpec || dataViewById?.toSpec() || adHocDataView?.toSpec();

      action.payload.scope.forEach((scope) => {
        const currentScopeActions = scopes[scope].actions;
        if (resolvedSpecToUse) {
          listenerApi.dispatch(currentScopeActions.setSelectedDataView(resolvedSpecToUse));
        } else if (dataViewByIdError || adhocDataViewCreationError) {
          const err = dataViewByIdError || adhocDataViewCreationError;
          listenerApi.dispatch(
            currentScopeActions.dataViewSelectionError(
              `An error occured when setting data view: ${err}`
            )
          );
        }
      });
    },
  };
};
