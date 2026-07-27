/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import {
  hasSeenOnboarding,
  IngestStep,
  GETTING_STARTED_PATH,
  markOnboardingExited,
  OnboardingLandingPage,
  SearchStep,
} from '@kbn/vectordb-onboarding';
import { HomePage } from './home/home_page';

const OnboardingRoutes = () => {
  // Unmounting means the user left /getting_started and all of its sub-routes.
  useEffect(() => () => markOnboardingExited(), []);

  return (
    <Routes>
      <Route exact path={GETTING_STARTED_PATH} component={OnboardingLandingPage} />
      <Route exact path={`${GETTING_STARTED_PATH}/ingest`} component={IngestStep} />
      <Route exact path={`${GETTING_STARTED_PATH}/search`} component={SearchStep} />
      <Route render={() => <Redirect to={GETTING_STARTED_PATH} />} />
    </Routes>
  );
};

export const AppRoutes = () => (
  <Routes>
    <Route
      exact
      path="/"
      render={() => (hasSeenOnboarding() ? <HomePage /> : <Redirect to={GETTING_STARTED_PATH} />)}
    />
    <Route path={GETTING_STARTED_PATH} component={OnboardingRoutes} />
    <Route render={() => <Redirect to="/" />} />
  </Routes>
);
