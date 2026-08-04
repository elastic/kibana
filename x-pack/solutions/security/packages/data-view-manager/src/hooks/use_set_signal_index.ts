/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useDispatch } from '../redux/redux';
import { sharedDataViewManagerSlice } from '../redux/slices';
import type { SignalIndexMetadata } from '../redux/types';

/**
 * Imperative entry point used by the host application to push the current
 * signal index metadata into the data view manager store. The signal index is
 * owned by the plugin (it comes from the detections user info), so the plugin
 * calls this whenever that metadata changes.
 */
export const useSetSignalIndex = () => {
  const dispatch = useDispatch();

  return useCallback(
    (signalIndex: SignalIndexMetadata) =>
      dispatch(sharedDataViewManagerSlice.actions.setSignalIndex(signalIndex)),
    [dispatch]
  );
};
