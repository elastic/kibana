/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { InitialAppData } from '../../../common/types';

import { AnalyticsCollectionView } from './components/analytics_collection_view/analytics_collection_view';
import { AnalyticsOverview } from './components/analytics_overview/analytics_overview';

import { ROOT_PATH, COLLECTION_VIEW_PATH } from './routes';

export const Analytics: React.FC<InitialAppData> = () => {
  return (
    <Routes>
      <Route exact path={ROOT_PATH}>
        <AnalyticsOverview />
      </Route>
      <Route path={COLLECTION_VIEW_PATH}>
        <AnalyticsCollectionView />
      </Route>
    </Routes>
  );
};
