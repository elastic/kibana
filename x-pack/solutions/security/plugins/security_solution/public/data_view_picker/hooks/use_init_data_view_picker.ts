/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import { addListener, removeListener } from '@reduxjs/toolkit';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import { shared, scopes, type RootState, selectDataViewAsync } from '../redux';
import { useKibana } from '../../common/lib/kibana';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewPickerScopeName } from '../constants';

const createDataViewsLoadingListener = (dependencies: { dataViews: DataViewsServicePublic }) => {
  return {
    actionCreator: shared.actions.init,
    effect: async (
      _action: AnyAction,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      try {
        const dataViews = await dependencies.dataViews.getAllDataViewLazy();
        const dataViewSpecs = await Promise.all(dataViews.map((dataView) => dataView.toSpec()));

        listenerApi.dispatch(shared.actions.setDataViews(dataViewSpecs));
      } catch (error: unknown) {
        listenerApi.dispatch(shared.actions.error());
      }
    },
  } as any;
};

const createDataViewSelectedListener = (dependencies: { dataViews: DataViewsServicePublic }) => {
  return {
    actionCreator: selectDataViewAsync,
    effect: async (
      action: ReturnType<typeof selectDataViewAsync>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      console.log('selectDataViewAsync', action);

      try {
        if (action.payload.id) {
          const dataViewById = await dependencies.dataViews.get(action.payload.id);
          const dataViewSpec = dataViewById.toSpec();
          listenerApi.dispatch(
            scopes[action.payload.scope].actions.setSelectedDataView(dataViewSpec)
          );
        } else {
          const adhocDataView = await dependencies.dataViews.create({
            id: 'adhoc',
            title: action.payload.patterns?.join(','),
          });
          const dataViewSpec = adhocDataView.toSpec();
          listenerApi.dispatch(
            scopes[action.payload.scope].actions.setSelectedDataView(dataViewSpec)
          );
        }
      } catch (error: unknown) {
        console.error(error);
      }
    },
  } as any;
};

/**
 * Should only be used once in the application, on the top level of the rendering tree
 */
export const useInitDataViewPicker = () => {
  const dispatch = useDispatch();
  const services = useKibana().services;

  useEffect(() => {
    const dataViewsLoadingListener = createDataViewsLoadingListener({
      dataViews: services.dataViews,
    });

    const dataViewSelectedListener = createDataViewSelectedListener({
      dataViews: services.dataViews,
    });

    dispatch(addListener(dataViewsLoadingListener));
    dispatch(addListener(dataViewSelectedListener));

    dispatch(shared.actions.init());

    // Preload the default view
    dispatch(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: DataViewPickerScopeName.default,
      })
    );

    return () => {
      dispatch(removeListener(dataViewsLoadingListener));
      dispatch(removeListener(dataViewSelectedListener));
    };
  }, [dispatch, services.dataViews]);
};
