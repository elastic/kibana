/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { getContext, resetContext } from 'kea';
import { Store } from 'redux';

import { of } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { Router } from '@kbn/shared-ux-router';

import { DEFAULT_PRODUCT_FEATURES } from '../../common/constants';
import { ClientConfigType, InitialAppData } from '../../common/types';
import { PluginsStart, ClientData, ESConfig, UpdateSideNavDefinitionFn } from '../plugin';

import { mountFlashMessagesLogic } from './shared/flash_messages';
import { mountHttpLogic } from './shared/http';
import { mountKibanaLogic } from './shared/kibana';
import { mountLicensingLogic } from './shared/licensing';

/**
 * This file serves as a reusable wrapper to share Kibana-level context and other helpers
 * between various Enterprise Search plugins (e.g. AppSearch, WorkplaceSearch, ES landing page)
 * which should be imported and passed in as the first param in plugin.ts.
 */

export const renderApp = (
  App: React.FC<InitialAppData>,
  {
    params,
    core,
    plugins,
    isSidebarEnabled = true,
    updateSideNavDefinition,
  }: {
    core: CoreStart;
    isSidebarEnabled: boolean;
    params: AppMountParameters;
    plugins: PluginsStart;
    updateSideNavDefinition: UpdateSideNavDefinitionFn;
  },
  { config, data, esConfig }: { config: ClientConfigType; data: ClientData; esConfig: ESConfig }
) => {
  const { errorConnectingMessage, features, kibanaVersion } = data;
  const { history } = params;
  const { application, chrome, http, notifications, uiSettings } = core;
  const { capabilities, navigateToUrl } = application;
  const {
    charts,
    cloud,
    guidedOnboarding,
    indexManagement: indexManagementPlugin,
    lens,
    security,
    share,
    ml,
    fleet,
    uiActions,
  } = plugins;

  const productFeatures = features ?? { ...DEFAULT_PRODUCT_FEATURES };

  const EmptyContext: FC<PropsWithChildren<unknown>> = ({ children }) => <>{children}</>;
  const CloudContext = cloud?.CloudContextProvider || EmptyContext;

  resetContext({ createStore: true });
  const store = getContext().store;
  const indexMappingComponent = indexManagementPlugin?.getIndexMappingComponent({ history });

  const connectorTypes = plugins.searchConnectors?.getConnectorTypes() || [];

  const unmountKibanaLogic = mountKibanaLogic({
    application,
    capabilities,
    charts,
    cloud,
    config,
    connectorTypes,
    console: plugins.console,
    coreSecurity: core.security,
    data: plugins.data,
    esConfig,
    fleet,
    getChromeStyle$: chrome.getChromeStyle$,
    getNavLinks: chrome.navLinks.getAll,
    guidedOnboarding,
    history,
    indexMappingComponent,
    isSidebarEnabled,
    kibanaVersion,
    lens,
    ml,
    navigateToUrl,
    productFeatures,
    renderHeaderActions: (HeaderActions) =>
      params.setHeaderActionMenu(
        HeaderActions ? renderHeaderActions.bind(null, HeaderActions, store, params) : undefined
      ),
    security,
    setBreadcrumbs: chrome.setBreadcrumbs,
    setChromeIsVisible: chrome.setIsVisible,
    setDocTitle: chrome.docTitle.change,
    share,
    uiActions,
    uiSettings,
    updateSideNavDefinition,
  });
  const unmountLicensingLogic = mountLicensingLogic({
    canManageLicense: core.application.capabilities.management?.stack?.license_management,
    license$: plugins.licensing?.license$ || of(undefined),
  });
  const unmountHttpLogic = mountHttpLogic({
    errorConnectingMessage,
    http,
  });

  const unmountFlashMessagesLogic = mountFlashMessagesLogic({ notifications });
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$: params.theme$ }}>
        <EuiThemeProvider darkMode={core.theme.getTheme().darkMode}>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
            }}
          >
            <CellActionsProvider
              getTriggerCompatibleActions={plugins.uiActions.getTriggerCompatibleActions}
            >
              <CloudContext>
                <Provider store={store}>
                  <Router history={params.history}>
                    <App features={features} kibanaVersion={kibanaVersion} />
                  </Router>
                </Provider>
              </CloudContext>
            </CellActionsProvider>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </KibanaThemeProvider>
    </I18nProvider>,
    params.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
    unmountKibanaLogic();
    unmountLicensingLogic();
    unmountHttpLogic();
    unmountFlashMessagesLogic();
    plugins.data?.search.session.clear();
  };
};

/**
 * Render function for Kibana's header action menu chrome -
 * reusable by any Enterprise Search plugin simply by passing in
 * a custom HeaderActions component (e.g., WorkplaceSearchHeaderActions)
 * @see https://github.com/elastic/kibana/blob/8.0/docs/development/core/public/kibana-plugin-core-public.appmountparameters.setheaderactionmenu.md
 */

export const renderHeaderActions = (
  HeaderActions: React.FC,
  store: Store,
  params: AppMountParameters,
  kibanaHeaderEl: HTMLElement
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$: params.theme$ }}>
        <Provider store={store}>
          <HeaderActions />
        </Provider>
      </KibanaThemeProvider>
    </I18nProvider>,
    kibanaHeaderEl
  );
  return () => ReactDOM.render(<></>, kibanaHeaderEl);
};
