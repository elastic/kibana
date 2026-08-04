/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import type { AnyAction, Dispatch, ListenerEffectAPI } from 'redux-toolkit-v1';
import {
  addListener as originalAddListener,
  removeListener as originalRemoveListener,
} from 'redux-toolkit-v1';

import { useDispatch } from '../redux/redux';
import { useDataViewManagerDependencies } from '../context';
import { createDataViewSelectedListener } from '../redux/listeners/data_view_selected';
import { createInitListener } from '../redux/listeners/init_listener';
import { sharedDataViewManagerSlice } from '../redux/slices';
import { type SelectDataViewAsyncPayload } from '../redux/actions';
import { PageScope } from '../constants';
import type { RootState } from '../redux/reducer';

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
 * Engine hook for the data view manager. Registers the initialization and
 * per-scope selection listeners on the package's own store (using the
 * host-supplied dependencies exposed through the provider) and returns a
 * callback that kicks off initialization with an optional list of initial
 * selections.
 *
 * Should only be used once, at the top of the rendering tree wrapped by
 * `DataViewManagerProvider`.
 */
export const useInitDataViewManager = () => {
  const dispatch = useDispatch();
  const { services, createDefaultDataView, createExploreDataView } =
    useDataViewManagerDependencies();

  useEffect(() => {
    // NOTE: init listener contains logic that preloads default security solution data view
    const dataViewsLoadingListener = createInitListener({
      dataViews: services.dataViews,
      http: services.http,
      uiSettings: services.uiSettings,
      notifications: services.notifications,
      application: services.application,
      spaces: services.spaces,
      storage: services.storage,
      createDefaultDataView,
      createExploreDataView,
    });

    dispatch(addListener(dataViewsLoadingListener));

    // NOTE: Every scope has its own listener instance; this allows for cancellation
    const listeners = [
      PageScope.default,
      PageScope.timeline,
      PageScope.alerts,
      PageScope.attacks,
      PageScope.analyzer,
      PageScope.explore,
    ].map((scope) =>
      createDataViewSelectedListener({
        scope,
        spaces: services.spaces,
        dataViews: services.dataViews,
        notifications: services.notifications,
        storage: services.storage,
      })
    );

    listeners.forEach((dataViewSelectedListener) => {
      dispatch(addListener(dataViewSelectedListener));
    });

    return () => {
      dispatch(removeListener(dataViewsLoadingListener));
      listeners.forEach((dataViewSelectedListener) => {
        dispatch(removeListener(dataViewSelectedListener));
      });
    };
  }, [dispatch, services, createDefaultDataView, createExploreDataView]);

  return useCallback(
    (initialSelection: SelectDataViewAsyncPayload[]) =>
      dispatch(sharedDataViewManagerSlice.actions.init(initialSelection)),
    [dispatch]
  );
};
