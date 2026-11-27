/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import {
  GettingStartedRedirect,
  hasVisitedGettingStarted,
} from './components/getting_started_redirect';
import { IntegratedHomeApp } from './components/search_homepage/integrated_home_app';
import { SearchHomepagePage } from './components/search_homepage/search_homepage';
import { useKibana } from './hooks/use_kibana';

export const HomepageRouter = () => {
  const {
    services: { elasticsearchHome },
  } = useKibana();

  if (elasticsearchHome.useIntegratedOnboardingEnabled()) {
    return <IntegratedHomeApp />;
  }

  return (
    <Routes>
      <Route
        render={() =>
          hasVisitedGettingStarted() ? <SearchHomepagePage /> : <GettingStartedRedirect />
        }
      />
    </Routes>
  );
};
