/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { isEmpty } from 'lodash';
import { useRouteMatch } from 'react-router-dom';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../../../../../../../common/constants';
import {
  getMaintenanceWindowsAction,
  selectMaintenanceWindowsState,
} from '../../../../state/maintenance_windows';

export function useMaintenanceWindows() {
  const dispatch = useDispatch();
  const { isLoading, data } = useSelector(selectMaintenanceWindowsState);

  // reload again on monitor add/edit pages even if data is already present

  const isMonitorAddEditPage = useRouteMatch({
    path: [MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE],
  });

  useEffect(() => {
    if (isEmpty(data) || isMonitorAddEditPage) {
      dispatch(getMaintenanceWindowsAction.get());
    }
  }, [data, dispatch, isMonitorAddEditPage]);

  return {
    isLoading,
    data,
  };
}
