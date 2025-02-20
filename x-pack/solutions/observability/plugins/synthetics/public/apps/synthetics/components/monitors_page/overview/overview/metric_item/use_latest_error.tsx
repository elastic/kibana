/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../../../contexts';
import { getMonitorLastRunAction, selectLastRunMetadata } from '../../../../../state';

interface UseMonitorLatestPingParams {
  monitorId: string;
  isPopoverOpen?: boolean | string | null;
  locationLabel: string;
}

export const useLatestError = ({
  monitorId,
  isPopoverOpen,
  locationLabel,
}: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { data: latestPing, loading, loaded } = useSelector(selectLastRunMetadata);

  useEffect(() => {
    if (monitorId && locationLabel && isPopoverOpen) {
      dispatch(getMonitorLastRunAction.get({ monitorId, locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel, lastRefresh, isPopoverOpen]);

  return { loading, latestPing, loaded };
};
