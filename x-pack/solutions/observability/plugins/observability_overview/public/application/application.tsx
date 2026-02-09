/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { PluginContext } from '../context/plugin_context/plugin_context';
import type { ObservabilityOverviewPublicPluginsStart } from '../plugin';
import { useAppRoutes } from '../routes/routes';

// Simple 404 component
function PageNotFound() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>
        {i18n.translate('xpack.observabilityOverview.pageNotFound.h1.pageNotFoundLabel', {
          defaultMessage: 'Page not found',
        })}
      </h1>
    </div>
  );
}

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
  plugins,
  appMountParameters,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
  isServerless,
}: {
  core: CoreStart;
  plugins: ObservabilityOverviewPublicPluginsStart;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection?: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const isDarkMode = core.theme.getTheme().darkMode;

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observabilityOverview.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = plugins.cloud?.CloudContextProvider ?? React.Fragment;

  ReactDOM.render(
    core.rendering.addContext(
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
              }}
            >
              <PluginContext.Provider
                value={{
                  isDev,
                  appMountParameters,
                  ObservabilityPageTemplate,
                }}
              >
                <Router history={history}>
                  <EuiThemeProvider darkMode={isDarkMode}>
                    <PerformanceContextProvider>
                      <InspectorContextProvider>
                        <App />
                      </InspectorContextProvider>
                    </PerformanceContextProvider>
                  </EuiThemeProvider>
                </Router>
              </PluginContext.Provider>
            </KibanaContextProvider>
          </CloudProvider>
        </KibanaThemeProvider>
      </ApplicationUsageTrackingProvider>
    ),
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
