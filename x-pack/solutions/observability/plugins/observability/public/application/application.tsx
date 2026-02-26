/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import PageNotFound from '../pages/404';
import { PluginContext } from '../context/plugin_context/plugin_context';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { useAppRoutes } from '../routes/routes';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { HideableReactQueryDevTools } from './hideable_react_query_dev_tools';
import type { TelemetryServiceStart } from '../services/telemetry/types';

export function App() {
  const allRoutes = useAppRoutes();
  return (
    <>
      <Routes enableExecutionContextTracking={true}>
        {Object.keys(allRoutes).map((key) => {
          const path = key as keyof typeof allRoutes;
          const { handler, exact } = allRoutes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
        <Route>
          <PageNotFound />
        </Route>
      </Routes>
    </>
  );
}

export const renderApp = ({
  core,
  config,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  telemetryClient,
  usageCollection,
  isDev,
  kibanaVersion,
  isServerless,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  telemetryClient: TelemetryServiceStart;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const isDarkMode = core.theme.getTheme().darkMode;

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <ApplicationUsageTrackingProvider>
        <KibanaThemeProvider {...{ theme: { theme$ } }}>
          <CloudProvider>
            <KibanaContextProvider
              services={{
                ...core,
                ...plugins,
                storage: new Storage(localStorage),
                isDev,
                kibanaVersion,
                isServerless,
                telemetryClient,
              }}
            >
              <PluginContext.Provider
                value={{
                  isDev,
                  config,
                  appMountParameters,
                  observabilityRuleTypeRegistry,
                  ObservabilityPageTemplate,
                }}
              >
                <Router history={history}>
                  <EuiThemeProvider darkMode={isDarkMode}>
                    <RedirectAppLinks coreStart={core} data-test-subj="observabilityMainContainer">
                      <PerformanceContextProvider>
                        <QueryClientProvider client={queryClient}>
                          <InspectorContextProvider>
                            <App />
                            <HideableReactQueryDevTools />
                          </InspectorContextProvider>
                        </QueryClientProvider>
                      </PerformanceContextProvider>
                    </RedirectAppLinks>
                  </EuiThemeProvider>
                </Router>
              </PluginContext.Provider>
            </KibanaContextProvider>
          </CloudProvider>
        </KibanaThemeProvider>
      </ApplicationUsageTrackingProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    // This needs to be present to fix https://github.com/elastic/kibana/issues/155704
    // as the Overview page renders the UX Section component. That component renders a Lens embeddable
    // via the ExploratoryView app, which uses search sessions. Therefore on unmounting we need to clear
    // these sessions.
    plugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
