/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ConnectorsLandingPage } from '../pages/connectors_landing';

export const WorkplaceAIConnectorsRoutes = () => {
  return (
    <Routes>
      <Route path="/">
        <ConnectorsLandingPage />
      </Route>
    </Routes>
  );
};
