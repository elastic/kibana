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
      const currentScopeActions = scopes[action.payload.scope].actions;

      let dataViewSpec: DataViewSpec | null = null;

      let dataViewByIdError: unknown;
      let adhocDataViewCreationError: unknown;

      try {
        if (action.payload.id) {
          const dataViewById = await dependencies.dataViews.get(action.payload.id);
          dataViewSpec = dataViewById.toSpec();
        }
      } catch (error: unknown) {
        dataViewByIdError = error;
      }

      try {
        if (!dataViewSpec) {
          const title = action.payload.patterns?.join(',') ?? '';
          const adhocDataView = await dependencies.dataViews.create({
            id: `adhoc_${title}`,
            title,
          });
          dataViewSpec = adhocDataView.toSpec();
          listenerApi.dispatch(shared.actions.addAdhocDataView(dataViewSpec));
        }
      } catch (error: unknown) {
        adhocDataViewCreationError = error;
      }

      if (dataViewSpec) {
        listenerApi.dispatch(currentScopeActions.setSelectedDataView(dataViewSpec));
      } else {
        listenerApi.dispatch(currentScopeActions.dataViewSelectionError());
      }
    },
  };
};
