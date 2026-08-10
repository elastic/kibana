/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { getLocationMonitorsAction } from '../../../../state/settings/actions';
import { selectLocationMonitors } from '../../../../state/settings';
import { useSyntheticsRefreshContext } from '../../../../contexts';

export const useLocationMonitors = () => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();

  useEffect(() => {
    dispatch(getLocationMonitorsAction.get());
  }, [dispatch, lastRefresh]);

  return useSelector(selectLocationMonitors);
};
