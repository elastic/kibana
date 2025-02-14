/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { APP_WRAPPER_CLASS, AppMountParameters, CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PluginContext } from './context/plugin_context';
import { getRoutes } from './routes';
import { MultiplayerPublicPluginsStart } from './types';

interface Props {
  core: CoreStart;
  plugins: MultiplayerPublicPluginsStart;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
}

export const renderApp = ({
  core,
  plugins,
  appMountParameters,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
  isServerless,
}: Props) => {
  const { element, history } = appMountParameters;

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <ApplicationUsageTrackingProvider>
        <CloudProvider>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              storage: new Storage(localStorage),
              isDev,
              kibanaVersion,
              isServerless,
            }}
          >
            <PluginContext.Provider
              value={{
                isDev,
                isServerless,
                appMountParameters,
                ObservabilityPageTemplate,
              }}
            >
              <Router history={history}>
                <RedirectAppLinks coreStart={core} data-test-subj="observabilityMainContainer">
                  <PerformanceContextProvider>
                    <QueryClientProvider client={queryClient}>
                      <App />
                    </QueryClientProvider>
                  </PerformanceContextProvider>
                </RedirectAppLinks>
              </Router>
            </PluginContext.Provider>
          </KibanaContextProvider>
        </CloudProvider>
      </ApplicationUsageTrackingProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

function App() {
  const routes = getRoutes();

  return (
    <Routes enableExecutionContextTracking={true}>
      {Object.keys(routes).map((path) => {
        const { handler, exact } = routes[path];
        const Wrapper = () => {
          return handler();
        };
        return <Route key={path} path={path} exact={exact} component={Wrapper} />;
      })}
    </Routes>
  );
}
