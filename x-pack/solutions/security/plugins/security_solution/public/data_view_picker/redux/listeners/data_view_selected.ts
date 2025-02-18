/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { RootState } from '../reducer';
import { scopes, selectDataViewAsync, shared } from '../reducer';

export const createDataViewSelectedListener = (dependencies: {
  dataViews: DataViewsServicePublic;
}) => {
  return {
    actionCreator: selectDataViewAsync,
    effect: async (
      action: ReturnType<typeof selectDataViewAsync>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      const state = listenerApi.getState();

      const findCachedDataView = (id: string | null | undefined) => {
        const dataView =
          state.dataViewPicker.shared.adhocDataViews.find((dv) => dv.id === id) ?? null;

        // NOTE: validate if fields are available, otherwise dont return the view
        // This is required to compute browserFields later.
        if (!Object.keys(dataView?.fields || {})) {
          return null;
        }

        return dataView;
      };

      let dataViewByIdError: unknown;
      let adhocDataViewCreationError: unknown;

      /**
       * Try to locate the data view in cached entries first
       */
      let dataViewSpec: DataViewSpec | null = findCachedDataView(action.payload.id);

      if (!dataViewSpec) {
        try {
          if (action.payload.id) {
            const dataViewById = await dependencies.dataViews.get(action.payload.id);
            // eslint-disable-next-line require-atomic-updates
            dataViewSpec = dataViewById.toSpec();
          }
        } catch (error: unknown) {
          dataViewByIdError = error;
        }
      }

      if (!dataViewSpec) {
        try {
          const title = action.payload.patterns?.join(',') ?? '';
          if (!title.length) {
            throw new Error('empty adhoc title field');
          }

          const adhocDataView = await dependencies.dataViews.create({
            id: `adhoc_${title}`,
            title,
          });
          listenerApi.dispatch(shared.actions.addDataView(adhocDataView));
          // eslint-disable-next-line require-atomic-updates
          dataViewSpec = adhocDataView.toSpec();
        } catch (error: unknown) {
          adhocDataViewCreationError = error;
        }
      }

      action.payload.scope.forEach((scope) => {
        const currentScopeActions = scopes[scope].actions;
        if (dataViewSpec) {
          listenerApi.dispatch(currentScopeActions.setSelectedDataView(dataViewSpec));
        } else if (dataViewByIdError || adhocDataViewCreationError) {
          listenerApi.dispatch(
            currentScopeActions.dataViewSelectionError('An error occured when setting data view')
          );
        }
      });
    },
  };
};
