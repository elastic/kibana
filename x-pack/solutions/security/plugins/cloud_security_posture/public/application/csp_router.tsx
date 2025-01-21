/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { benchmarksNavigation, cloudPosturePages } from '../common/navigation/constants';
import type { CspSecuritySolutionContext } from '..';
import { SecuritySolutionContext } from './security_solution_context';
import * as Pages from '../pages';
import { CspRoute } from './csp_route';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/** Props for the cloud security posture router component */
export interface CspRouterProps {
  securitySolutionContext?: CspSecuritySolutionContext;
  getFindingsExpandableFlyout: GetFindingsExpandableFlyout;
}

export interface FindingsExpandableFlyoutProps {
  ruleId: string;
  resourceId: string;
  row?: any;
}

export type GetFindingsExpandableFlyout = (props: FindingsExpandableFlyoutProps) => ReactNode;

export const CspRouter = ({
  securitySolutionContext,
  getFindingsExpandableFlyout,
}: CspRouterProps) => {
  const routerElement = (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <CspRoute {...cloudPosturePages.findings}>
          <Pages.Findings getFindingsExpandableFlyout={getFindingsExpandableFlyout} />
        </CspRoute>
        <CspRoute {...cloudPosturePages.dashboard} component={Pages.ComplianceDashboard} />
        <CspRoute
          {...cloudPosturePages.vulnerability_dashboard}
          component={Pages.VulnerabilityDashboard}
        />

        <CspRoute {...cloudPosturePages.benchmarks}>
          <Routes>
            <CspRoute {...benchmarksNavigation.rules} component={Pages.Rules} />
            <CspRoute {...cloudPosturePages.benchmarks} component={Pages.Benchmarks} />
          </Routes>
        </CspRoute>

        <Route>
          <Redirect to={cloudPosturePages.dashboard.path} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );

  if (securitySolutionContext) {
    return (
      <SecuritySolutionContext.Provider value={securitySolutionContext}>
        {routerElement}
      </SecuritySolutionContext.Provider>
    );
  }

  return <>{routerElement}</>;
};

// Using a default export for usage with `React.lazy`
// eslint-disable-next-line import/no-default-export
export { CspRouter as default };
