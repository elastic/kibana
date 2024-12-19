/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AllDatasetsLocatorParams, ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { LinkToLogsPage } from '../pages/link_to/link_to_logs';
import { LogsPage } from '../pages/logs';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';
import { KbnUrlStateStorageFromRouterProvider } from '../containers/kbn_url_state_context';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports,
  isLogsExplorerAccessible: boolean,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, 'infraLogsPage');

  ReactDOM.render(
    <LogsApp
      core={core}
      storage={storage}
      history={history}
      plugins={plugins}
      pluginStart={pluginStart}
      setHeaderActionMenu={setHeaderActionMenu}
      theme$={theme$}
      isLogsExplorerAccessible={isLogsExplorerAccessible}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const LogsApp: React.FC<{
  core: CoreStart;
  history: History<unknown>;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  storage: Storage;
  theme$: AppMountParameters['theme$'];
  isLogsExplorerAccessible: boolean;
}> = ({
  core,
  history,
  pluginStart,
  plugins,
  setHeaderActionMenu,
  storage,
  theme$,
  isLogsExplorerAccessible,
}) => {
  const { logs } = core.application.capabilities;

  return (
    <CoreProviders core={core} pluginStart={pluginStart} plugins={plugins} theme$={theme$}>
      <CommonInfraProviders
        appName="Logs UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        theme$={theme$}
        triggersActionsUI={plugins.triggersActionsUi}
      >
        <Router history={history}>
          <KbnUrlStateStorageFromRouterProvider
            history={history}
            toastsService={core.notifications.toasts}
          >
            <Routes>
              {isLogsExplorerAccessible && (
                <Route
                  path="/"
                  exact
                  render={() => {
                    plugins.share.url.locators
                      .get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)
                      ?.navigate({});

                    return null;
                  }}
                />
              )}
              <Route path="/link-to" component={LinkToLogsPage} />
              {logs?.show && <Route path="/" component={LogsPage} />}
            </Routes>
          </KbnUrlStateStorageFromRouterProvider>
        </Router>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
