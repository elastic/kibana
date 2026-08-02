/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PND_PLUGIN_NAME } from '@kbn/pnd-common';
import { AppChromeLayout } from './components/app_chrome';
import { PndClientConfigProvider } from './hooks/use_pnd_client_config';
import type { PndClientConfig, PndStartDependencies } from './types';
import { PndRoutes } from './routes';

interface RenderAppParams {
  coreStart: CoreStart;
  startDeps: PndStartDependencies;
  params: AppMountParameters;
  config: PndClientConfig;
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export const renderApp = ({ coreStart, startDeps, params, config }: RenderAppParams) => {
  coreStart.chrome.docTitle.change(PND_PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: 'always',
        refetchOnMount: 'always',
      },
    },
  });

  /**
   * `KibanaContextProvider` backs `useKibana()` from `@kbn/kibana-react-plugin`, which the app uses
   * for `services.http` and `services.notifications`.
   *
   * `history` rides along because `@kbn/unsaved-changes-prompt` blocks SPA navigation through the
   * `ScopedHistory` the `Router` below is mounted with, and react-router's `useHistory()` returns
   * that same object typed as a plain `History`, which the prompt does not accept. Putting it in
   * services is how the other plugins that use the prompt reach it (e.g. Ingest Pipelines).
   */
  const App = () => (
    <KibanaContextProvider services={{ ...coreStart, ...startDeps, history: params.history }}>
      <QueryClientProvider client={queryClient}>
        <PndClientConfigProvider config={config}>
          <Router history={params.history}>
            <div style={rootStyle}>
              <AppChromeLayout>
                <PndRoutes navigateToApp={coreStart.application.navigateToApp} />
              </AppChromeLayout>
            </div>
          </Router>
        </PndClientConfigProvider>
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
