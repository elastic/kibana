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
  OnboardingLandingPage,
  SearchStep,
} from '@kbn/vectordb-onboarding';
import { HomePage } from './home_page';

interface AppRoutesProps {
  onOnboardingExit: () => void;
}

const OnboardingRoutes = ({ onOnboardingExit }: AppRoutesProps) => {
  useEffect(() => onOnboardingExit, [onOnboardingExit]);

  return (
    <Routes>
      <Route exact path={GETTING_STARTED_PATH} component={OnboardingLandingPage} />
      <Route exact path={`${GETTING_STARTED_PATH}/ingest`} component={IngestStep} />
      <Route exact path={`${GETTING_STARTED_PATH}/search`} component={SearchStep} />
      <Route render={() => <Redirect to={GETTING_STARTED_PATH} />} />
    </Routes>
  );
};

const Home = ({ onOnboardingExit }: AppRoutesProps) => {
  useEffect(() => onOnboardingExit(), [onOnboardingExit]);

  return <HomePage />;
};

export const AppRoutes = ({ onOnboardingExit }: AppRoutesProps) => (
  <Routes>
    <Route
      exact
      path="/"
      render={() =>
        hasSeenOnboarding() ? (
          <Home onOnboardingExit={onOnboardingExit} />
        ) : (
          <Redirect to={GETTING_STARTED_PATH} />
        )
      }
    />
    <Route path={GETTING_STARTED_PATH}>
      <OnboardingRoutes onOnboardingExit={onOnboardingExit} />
    </Route>
    <Route render={() => <Redirect to="/" />} />
  </Routes>
);
