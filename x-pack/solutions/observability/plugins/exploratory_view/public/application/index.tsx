/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { PluginContext } from '../context/plugin_context';
import { routes } from '../routes';
import type { ExploratoryViewPublicPluginsStart } from '../plugin';

export type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

function App(props: { startServices: StartServices }) {
  return (
    <>
      <Routes>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler({ startServices: props.startServices });
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Routes>
    </>
  );
}

export const renderApp = ({
  core,
  appMountParameters,
  plugins,
  usageCollection,
  isDev,
}: {
  core: CoreStart;
  appMountParameters: AppMountParameters;
  plugins: ExploratoryViewPublicPluginsStart;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
}) => {
  const { element, history } = appMountParameters;

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <ApplicationUsageTrackingProvider>
        <KibanaContextProvider
          services={{
            ...core,
            ...plugins,
            storage: new Storage(localStorage),
            isDev,
          }}
        >
          <PluginContext.Provider
            value={{
              appMountParameters,
            }}
          >
            <Router history={history}>
              <div className={APP_WRAPPER_CLASS} data-test-subj="exploratoryViewMainContainer">
                <RedirectAppLinks
                  coreStart={{
                    application: core.application,
                  }}
                >
                  <App startServices={core} />
                </RedirectAppLinks>
              </div>
            </Router>
          </PluginContext.Provider>
        </KibanaContextProvider>
      </ApplicationUsageTrackingProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
