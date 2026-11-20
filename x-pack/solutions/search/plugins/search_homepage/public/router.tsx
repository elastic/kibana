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
import { SearchHomepagePage } from './components/search_homepage/search_homepage';
import { SearchWebCrawlsPage } from './components/web_crawls/web_crawls';
import { WEB_CRAWLS_ROUTE } from './home_config';

export const HomepageRouter = () => {
  return (
    <Routes>
      <Route path={WEB_CRAWLS_ROUTE}>
        <SearchWebCrawlsPage />
      </Route>
      <Route
        render={() =>
          hasVisitedGettingStarted() ? <SearchHomepagePage /> : <GettingStartedRedirect />
        }
      />
    </Routes>
  );
};
