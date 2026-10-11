/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import ReactDOM from 'react-dom';
import type { AppMountParameters, AppUnmount, CoreStart } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import { ALERTZERO_PLUGIN_NAME } from '@kbn/alertzero-common';
import { getSharedInvestigationsQueryClient } from '@kbn/agentic-investigations-plugin/public';
import { AccessBoundary } from './components/access_boundary';
import type { SubscriptionAvailability } from '../common/availability';
import { AppChromeLayout } from './components/app_chrome';
import type { AlertZeroStartDependencies } from './types';
import { AlertZeroRoutes } from './routes';

interface RenderAppParams {
  coreStart: CoreStart;
  startDeps: AlertZeroStartDependencies;
  params: AppMountParameters;
  availability$: Observable<SubscriptionAvailability>;
  isServerless: boolean;
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export const renderApp = async ({
  coreStart,
  startDeps,
  params,
  availability$,
  isServerless,
}: RenderAppParams): Promise<AppUnmount> => {
  coreStart.chrome.docTitle.change(ALERTZERO_PLUGIN_NAME);

  // Shared with the investigation flyout's "Proposed actions" slot (registered by the
  // agenticInvestigations plugin), so a decision made in either invalidates the other's cache
  // directly instead of needing a cross-boundary signal to bridge two separate ones.
  const queryClient = await getSharedInvestigationsQueryClient();

  /**
   * `KibanaContextProvider` backs `useKibana()` from `@kbn/kibana-react-plugin`, which the app uses
   * for `services.http` and `services.notifications`.
   */
  const App = () => (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...startDeps,
        // `security` above is the Security plugin's contract, which shadows Core's. Core's
        // service-account API is exposed under its own key.
        serviceAccounts: coreStart.security.serviceAccounts,
        isServerless,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Router history={params.history}>
          <div style={rootStyle}>
            <AccessBoundary
              availability$={availability$}
              serviceAccountsEnabled={coreStart.security.serviceAccounts.isEnabled()}
            >
              <AppChromeLayout>
                <AlertZeroRoutes />
              </AppChromeLayout>
            </AccessBoundary>
          </div>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );

  /**
   * `rendering.addContext` supplies i18n, the EUI theme, and — via `chrome.withProvider` — the Chrome
   * service context that `@kbn/app-header` needs. Without it `AppHeader` throws
   * "useChromeService must be used within a ChromeServiceProvider".
   *
   * This replaces the previous `I18nProvider` + `wrapWithTheme` pair, which covered i18n and theme
   * but not Chrome. Prefer it over `KibanaRenderContextProvider`, which is deprecated in favour of
   * this contract.
   */
  ReactDOM.render(coreStart.rendering.addContext(<App />), params.element);

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
