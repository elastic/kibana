/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
import { indexStatusAction } from '../../../state/actions';
import { indexStatusSelector, selectDynamicSettings } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';
import {
  MONITOR_ADD_ROUTE,
  MONITOR_EDIT_ROUTE,
  MONITOR_ROUTE,
} from '../../../../../common/constants';

export const useHasData = () => {
  const { loading, error, data } = useSelector(indexStatusSelector);
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { settings } = useSelector(selectDynamicSettings);

  const dispatch = useDispatch();

  const isAddRoute = useRouteMatch(MONITOR_ADD_ROUTE);
  const isEditRoute = useRouteMatch(MONITOR_EDIT_ROUTE);
  const isMonitorRoute = useRouteMatch(MONITOR_ROUTE);

  const skippedRoute = isAddRoute?.isExact || isEditRoute?.isExact || isMonitorRoute?.isExact;

  useEffect(() => {
    if (!skippedRoute) {
      dispatch(indexStatusAction.get());
    }
  }, [dispatch, lastRefresh, skippedRoute]);

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  return {
    data,
    error,
    loading,
    settings,
  };
};
