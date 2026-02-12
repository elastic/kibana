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
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../common/constants';
import type { RootState } from '../redux/reducer';
import { useKibana } from '../../common/lib/kibana';
import { createDataViewSelectedListener } from '../redux/listeners/data_view_selected';
import { createInitListener } from '../redux/listeners/init_listener';
import { sharedDataViewManagerSlice } from '../redux/slices';
import { type SelectDataViewAsyncPayload } from '../redux/actions';
import { PageScope } from '../constants';
import { useUserInfo } from '../../detections/components/user_info';

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
  const enableAlertsAndAttacksAlignment = services.uiSettings.get(
    ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
    false
  );

  const {
    loading: loadingSignalIndex,
    signalIndexName,
    signalIndexMappingOutdated,
  } = useUserInfo();

  const onSignalIndexUpdated = useCallback(() => {
    if (!loadingSignalIndex && signalIndexName != null) {
      dispatch(
        sharedDataViewManagerSlice.actions.setSignalIndex({
          name: signalIndexName,
          isOutdated: !!signalIndexMappingOutdated,
        })
      );
    }
  }, [dispatch, loadingSignalIndex, signalIndexMappingOutdated, signalIndexName]);

  useEffect(() => {
    onSignalIndexUpdated();
    // because we only want onSignalIndexUpdated to run when signalIndexName updates,
    // but we want to know about the updates from the dependencies of onSignalIndexUpdated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalIndexName]);

  useEffect(() => {
    // NOTE: init listener contains logic that preloads default security solution data view
    const dataViewsLoadingListener = createInitListener(
      {
        dataViews: services.dataViews,
        http: services.http,
        uiSettings: services.uiSettings,
        application: services.application,
        spaces: services.spaces,
        storage: services.storage,
      },
      enableAlertsAndAttacksAlignment
    );

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
        dataViews: services.dataViews,
        storage: services.storage,
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
  }, [
    enableAlertsAndAttacksAlignment,
    dispatch,
    services.application,
    services.dataViews,
    services.http,
    services.spaces,
    services.storage,
    services.uiSettings,
  ]);

  return useCallback(
    (initialSelection: SelectDataViewAsyncPayload[]) =>
      dispatch(sharedDataViewManagerSlice.actions.init(initialSelection)),
    [dispatch]
  );
};
