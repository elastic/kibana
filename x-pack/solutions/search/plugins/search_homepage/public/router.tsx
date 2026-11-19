/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';

import {
  GUIDED_SETUP_PATH,
  HOME_PATH,
  LEGACY_ANALYTICS_HOME_PATH,
  LEGACY_ANALYTICS_ONBOARDING_PATH,
} from './analytics/constants';
import { storePreferredJourney } from './analytics/hooks/use_analytics_preferences';
import { WEB_CRAWLS_ROUTE } from './home_config';

const UnifiedHomePage = lazy(() =>
  import('./analytics/components/home/unified_home').then(({ UnifiedHomePage: Page }) => ({
    default: Page,
  }))
);

const GuidedSetupPage = lazy(() =>
  import('./analytics/components/onboarding/guided_setup').then(({ GuidedSetupPage: Page }) => ({
    default: Page,
  }))
);

const SearchWebCrawlsPage = lazy(() =>
  import('./components/web_crawls/web_crawls').then(({ SearchWebCrawlsPage: Page }) => ({
    default: Page,
  }))
);

/** Sends an old event-analytics URL to its unified page, remembering that analytics was asked for. */
const LegacyAnalyticsRedirect = ({ to }: { to: string }): React.JSX.Element => {
  useEffect(() => {
    storePreferredJourney('analytics');
  }, []);

  return <Redirect to={to} />;
};

/**
 * One home and one guided setup. What they show is decided by the data in the cluster, so there
 * is no route per journey and no first-visit redirect.
 */
export const HomepageRouter = (): React.JSX.Element => (
  <Suspense fallback={null}>
    <Routes>
      <Route exact path={GUIDED_SETUP_PATH}>
        <GuidedSetupPage />
      </Route>
      <Route exact path={LEGACY_ANALYTICS_ONBOARDING_PATH}>
        <LegacyAnalyticsRedirect to={GUIDED_SETUP_PATH} />
      </Route>
      <Route exact path={LEGACY_ANALYTICS_HOME_PATH}>
        <LegacyAnalyticsRedirect to={HOME_PATH} />
      </Route>
      <Route exact path={WEB_CRAWLS_ROUTE}>
        <SearchWebCrawlsPage />
      </Route>
      <Route>
        <UnifiedHomePage />
      </Route>
    </Routes>
  </Suspense>
);
