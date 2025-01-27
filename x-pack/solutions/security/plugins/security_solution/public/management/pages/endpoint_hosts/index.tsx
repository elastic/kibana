/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Routes, Route } from '@kbn/shared-ux-router';
import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { EndpointAction } from './store/action';
import { EndpointList } from './view';
import { MANAGEMENT_ROUTING_ENDPOINTS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';

/**
 * Provides the routing container for the hosts related views
 */
export const EndpointsContainer = memo(() => {
  const dispatch = useDispatch<(a: EndpointAction) => void>();

  useEffect(() => {
    return () => dispatch({ type: 'serverFinishedInitialization', payload: false });
  }, [dispatch]);

  return (
    <Routes>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} exact component={EndpointList} />
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
});

EndpointsContainer.displayName = 'EndpointsContainer';
