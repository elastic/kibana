/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { CoverageOverviewDashboardContextProvider } from './coverage_overview_dashboard_context';
import { CoverageOverviewDashboard } from './coverage_overview_dashboard';
import { CoverageOverviewAppHeader } from './coverage_overview_app_header';

export const CoverageOverviewPage = () => (
  <>
    <CoverageOverviewDashboardContextProvider>
      <CoverageOverviewAppHeader />
      <SecuritySolutionPageWrapper data-test-subj="coverageOverviewPage">
        <CoverageOverviewDashboard />
      </SecuritySolutionPageWrapper>
    </CoverageOverviewDashboardContextProvider>
    <SpyRoute pageName={SecurityPageName.coverageOverview} />
  </>
);
