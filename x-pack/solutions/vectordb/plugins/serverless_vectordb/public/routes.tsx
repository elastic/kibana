/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import {
  hasSeenOnboarding,
  IngestStep,
  OnboardingLandingPage,
  SearchStep,
  TutorialsPage,
} from '@kbn/vectordb-onboarding';
import { HomePage } from './home/home_page';
import type { ServerlessVectordbServices } from './types';

const OnboardingRoutes = () => {
  const {
    services: { chrome },
  } = useKibana<ServerlessVectordbServices>();

  // Capture before child components can call markOnboardingSeen()
  const [showChrome] = useState(() => hasSeenOnboarding());

  useEffect(() => {
    chrome.setIsVisible(showChrome);
    return () => chrome.setIsVisible(true);
  }, [chrome, showChrome]);

  return (
    <Routes>
      <Route exact path="/onboarding" component={OnboardingLandingPage} />
      <Route exact path="/onboarding/ingest" component={IngestStep} />
      <Route exact path="/onboarding/search" component={SearchStep} />
    </Routes>
  );
};

export const AppRoutes = () => (
  <Routes>
    <Route
      exact
      path="/"
      render={() => (hasSeenOnboarding() ? <HomePage /> : <Redirect to="/onboarding" />)}
    />
    <Route path="/onboarding" component={OnboardingRoutes} />
    <Route exact path="/tutorials" component={TutorialsPage} />
    <Route render={() => <Redirect to="/" />} />
  </Routes>
);
