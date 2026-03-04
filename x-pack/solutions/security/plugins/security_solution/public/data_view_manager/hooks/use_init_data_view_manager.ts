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
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useUserInfo } from '../../detections/components/user_info';
import { useDataViewManagerLogger } from './use_data_view_logger';

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
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const enableAlertsAndAttacksAlignment = services.uiSettings.get(
    ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
    false
  );

  const logger = useDataViewManagerLogger('useInitDataViewManager');
  const createInitListenerLogger = useDataViewManagerLogger('createInitListener');
  const createDataViewSelectedListenerLogger = useDataViewManagerLogger(
    'createDataViewSelectedListener'
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
      logger.debug(`signal index set: ${signalIndexName}`);
    }
  }, [dispatch, loadingSignalIndex, logger, signalIndexMappingOutdated, signalIndexName]);

  useEffect(() => {
    // TODO: (new data view picker) remove this in cleanup phase https://github.com/elastic/security-team/issues/12665
    // Also, make sure it works exactly as x-pack/solutions/security/plugins/security_solution/public/sourcerer/containers/use_init_sourcerer.tsx
    if (!newDataViewPickerEnabled) {
      return;
    }

    onSignalIndexUpdated();
    // because we only want onSignalIndexUpdated to run when signalIndexName updates,
    // but we want to know about the updates from the dependencies of onSignalIndexUpdated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalIndexName]);

  useEffect(() => {
    // TODO: (new data view picker) remove this in cleanup phase https://github.com/elastic/security-team/issues/12665
    if (!newDataViewPickerEnabled) {
      return;
    }

    // NOTE: init listener contains logic that preloads default security solution data view
    const dataViewsLoadingListener = createInitListener(
      {
        dataViews: services.dataViews,
        http: services.http,
        uiSettings: services.uiSettings,
        application: services.application,
        spaces: services.spaces,
        storage: services.storage,
        logger: createInitListenerLogger,
      },
      enableAlertsAndAttacksAlignment
    );

    logger.debug('Registering data view manager listeners');

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
        logger: createDataViewSelectedListenerLogger,
      })
    );

    logger.debug('Registering data view selected listeners for all scopes');

    listeners.forEach((dataViewSelectedListener) => {
      dispatch(addListener(dataViewSelectedListener));
    });

    // NOTE: this kicks off the data loading in the Data View Picker

    return () => {
      logger.debug('Cleaning up listeners');
      dispatch(removeListener(dataViewsLoadingListener));
      listeners.forEach((dataViewSelectedListener) => {
        logger.debug(`Removed listener for scope ${dataViewSelectedListener.actionCreator.name}`);
        dispatch(removeListener(dataViewSelectedListener));
      });
    };
  }, [
    enableAlertsAndAttacksAlignment,
    dispatch,
    logger,
    newDataViewPickerEnabled,
    services.application,
    services.dataViews,
    services.http,
    createInitListenerLogger,
    services.spaces,
    services.storage,
    services.uiSettings,
    createDataViewSelectedListenerLogger,
  ]);

  return useCallback(
    (initialSelection: SelectDataViewAsyncPayload[]) => {
      logger.debug(
        `Initializing Data View Manager with initial selection: ${JSON.stringify(initialSelection)}`
      );
      dispatch(sharedDataViewManagerSlice.actions.init(initialSelection));
    },
    [dispatch, logger]
  );
};
