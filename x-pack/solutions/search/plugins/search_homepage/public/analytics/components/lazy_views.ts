/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

// Each journey's views are their own chunk, so a deployment only loads the journey its data calls for.

export const LazyNoDataView = lazy(() =>
  import('./home/no_data_view').then(({ NoDataView }) => ({ default: NoDataView }))
);

export const LazyAnalyticsHome = lazy(() =>
  import('./home/analytics_home').then(({ AnalyticsHome }) => ({ default: AnalyticsHome }))
);

export const LazySearchHome = lazy(() =>
  import('./home/search_home').then(({ SearchHome }) => ({ default: SearchHome }))
);

export const LazyConnectStep = lazy(() =>
  import('./onboarding/connect_step').then(({ ConnectStep }) => ({ default: ConnectStep }))
);

export const LazyAnalyticsSetupStep = lazy(() =>
  import('./onboarding/analytics_setup_step').then(({ AnalyticsSetupStep }) => ({
    default: AnalyticsSetupStep,
  }))
);

export const LazySearchSetupStep = lazy(() =>
  import('./onboarding/search_setup_step').then(({ SearchSetupStep }) => ({
    default: SearchSetupStep,
  }))
);
