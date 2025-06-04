/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { isEmpty } from 'lodash';
import {
  getMaintenanceWindowsAction,
  selectMaintenanceWindowsState,
} from '../../../../state/maintenance_windows';

export function useMaintenanceWindows() {
  const dispatch = useDispatch();
  const { isLoading, data } = useSelector(selectMaintenanceWindowsState);

  useEffect(() => {
    if (isEmpty(data)) {
      dispatch(getMaintenanceWindowsAction.get());
    }
  }, [data, dispatch]);

  return {
    isLoading,
    data,
  };
}
