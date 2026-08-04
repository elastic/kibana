/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import {
  useInitDataViewManager as useInitDataViewManagerEngine,
  useSetSignalIndex,
} from '@kbn/data-view-manager';
import { useUserInfo } from '../../detections/components/user_info';

/**
 * Plugin-side orchestrator for the data view manager. Delegates listener wiring
 * to the package engine hook and, in addition, keeps the package store in sync
 * with the signal index metadata (which is owned by the plugin's detections
 * user info).
 *
 * Should only be used once in the application, on the top level of the
 * rendering tree wrapped by `DataViewManagerProvider`.
 */
export const useInitDataViewManager = () => {
  const initDataViewManager = useInitDataViewManagerEngine();
  const setSignalIndex = useSetSignalIndex();

  const {
    loading: loadingSignalIndex,
    signalIndexName,
    signalIndexMappingOutdated,
  } = useUserInfo();

  useEffect(() => {
    if (!loadingSignalIndex && signalIndexName != null) {
      setSignalIndex({ name: signalIndexName, isOutdated: !!signalIndexMappingOutdated });
    }
    // because we only want this to run when signalIndexName updates,
    // but we want to know about the updates from the other dependencies too
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalIndexName]);

  return initDataViewManager;
};
