/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import {
  addListener as originalAddListener,
  removeListener as originalRemoveListener,
} from '@reduxjs/toolkit';
import type { RootState } from '../redux/reducer';
import { useKibana } from '../../common/lib/kibana';
import { createDataViewSelectedListener } from '../redux/listeners/data_view_selected';
import { createInitListener } from '../redux/listeners/init_listener';
import { useEnableExperimental } from '../../common/hooks/use_experimental_features';
import { sharedDataViewManagerSlice } from '../redux/slices';
import { type SelectDataViewAsyncPayload } from '../redux/actions';
import { DataViewManagerScopeName } from '../constants';

type OriginalListener = Parameters<typeof originalAddListener>[0];

interface Listener<Action extends AnyAction = AnyAction> {
  actionCreator?: unknown;
  effect: (action: Action, listenerApi: ListenerEffectAPI<RootState, Dispatch>) => void;
}

const addListener = <T extends AnyAction>(listener: Listener<T>) =>
  originalAddListener(listener as unknown as OriginalListener);

const removeListener = <T extends AnyAction>(listener: Listener<T>) =>
  originalRemoveListener(listener as unknown as OriginalListener);

/**
 * Should only be used once in the application, on the top level of the rendering tree
 */
export const useInitDataViewManager = () => {
  const dispatch = useDispatch();
  const services = useKibana().services;
  const { newDataViewPickerEnabled } = useEnableExperimental();

  useEffect(() => {
    if (!newDataViewPickerEnabled) {
      return;
    }

    const dataViewsLoadingListener = createInitListener({
      dataViews: services.dataViews,
    });

    dispatch(addListener(dataViewsLoadingListener));

    // NOTE: Every scope has its own listener instance; this allows for cancellation
    const listeners = [
      DataViewManagerScopeName.default,
      DataViewManagerScopeName.timeline,
      DataViewManagerScopeName.detections,
      DataViewManagerScopeName.analyzer,
    ].map((scope) =>
      createDataViewSelectedListener({
        scope,
        dataViews: services.dataViews,
      })
    );

    listeners.forEach((dataViewSelectedListener) => {
      dispatch(addListener(dataViewSelectedListener));
    });

    // NOTE: this kicks off the data loading in the Data View Picker

    return () => {
      dispatch(removeListener(dataViewsLoadingListener));
      listeners.forEach((dataViewSelectedListener) => {
        dispatch(removeListener(dataViewSelectedListener));
      });
    };
  }, [dispatch, newDataViewPickerEnabled, services.dataViews]);

  return useCallback(
    (initialSelection: SelectDataViewAsyncPayload[]) => {
      dispatch(sharedDataViewManagerSlice.actions.init(initialSelection));
    },
    [dispatch]
  );
};
