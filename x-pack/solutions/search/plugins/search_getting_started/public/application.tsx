/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
import type { SearchGettingStartedServicesContextDeps } from './types';
import { SearchGettingStartedPage } from './components/search_getting_started';
import { UsageTrackerContextProvider } from './contexts/usage_tracker_context';

export const renderApp = async (
  core: CoreStart,
  services: SearchGettingStartedServicesContextDeps,
  element: HTMLElement,
  queryClient: QueryClient
) => {
  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={{ ...core, ...services }}>
        <UsageTrackerContextProvider usageCollection={services.usageCollection}>
          <QueryClientProvider client={queryClient}>
            <I18nProvider>
              <Router history={services.history}>
                <SearchGettingStartedPage />
              </Router>
            </I18nProvider>
          </QueryClientProvider>
        </UsageTrackerContextProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
