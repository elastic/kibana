/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { TimelineId } from '../../../../common/types';
import { timelineActions } from '../../../timelines/store';

/**
 * This component should be used above all routes, but below the Provider.
 * It dispatches actions when the URL is changed.
 */
export const RouteCapture = memo<PropsWithChildren<unknown>>(({ children }) => {
  const { pathname, search, hash, state } = useLocation();
  const dispatch = useDispatch();
  const relevantUrlParams = useMemo(
    () => ({ pathname, search, hash, state }),
    [pathname, search, hash, state]
  );

  useEffect(() => {
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
  }, [dispatch, relevantUrlParams.pathname]);

  useEffect(() => {
    dispatch({ type: 'userChangedUrl', payload: relevantUrlParams });
  }, [dispatch, relevantUrlParams]);

  return <>{children}</>;
});

RouteCapture.displayName = 'RouteCapture';
