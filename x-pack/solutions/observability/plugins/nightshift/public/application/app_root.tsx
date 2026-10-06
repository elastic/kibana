/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import React, { useMemo } from 'react';
import { NightshiftPage } from '../nightshift_page';
import type { NightshiftStartDependencies } from '../types';

const queryClient = new QueryClient();

export function AppRoot({
  appMountParameters,
  coreStart,
  pluginsStart,
  isServerless,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  isServerless: boolean;
}) {
  const { history } = appMountParameters;

  // Flat shape so `useKibana().services` destructures the same way it did while
  // this app lived inside the observability plugin.
  const services = useMemo(
    () => ({ ...coreStart, ...pluginsStart, isServerless }),
    [coreStart, pluginsStart, isServerless]
  );

  return (
    <KibanaContextProvider services={services}>
      <Router history={history}>
        <RedirectAppLinks coreStart={coreStart} data-test-subj="nightshiftMainContainer">
          <PerformanceContextProvider>
            <QueryClientProvider client={queryClient}>
              <NightshiftPage />
            </QueryClientProvider>
          </PerformanceContextProvider>
        </RedirectAppLinks>
      </Router>
    </KibanaContextProvider>
  );
}
