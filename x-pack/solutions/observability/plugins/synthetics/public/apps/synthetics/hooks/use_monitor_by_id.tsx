/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMonitorAction, selectSyntheticsMonitor } from '../state';

export const useMonitorById = (configId: string | undefined) => {
  const dispatch = useDispatch();
  const monitor = useSelector(selectSyntheticsMonitor);

  useEffect(() => {
    if (configId) {
      dispatch(getMonitorAction.get({ monitorId: configId }));
    }
  }, [configId, dispatch]);

  return monitor?.config_id === configId ? monitor : undefined;
};
