/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { Route, Routes, Router } from '@kbn/shared-ux-router';
import type { RouteProps } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { APP_PATH } from '@kbn/security-solution-ai-for-soc/common';
import type { StartServices } from '../types';
import { routes } from '../routes';

interface RenderAppProps {
  element: HTMLElement;
  services: StartServices;
  usageCollection?: unknown;
  theme$: AppMountParameters['theme$'];
  history: History;
}

interface AppProps {
  services: StartServices;
  theme$: AppMountParameters['theme$'];
  history: History;
}

const AppComponent: React.FC<AppProps> = ({ services, theme$, history }) => {
  const isDarkMode = useKibanaIsDarkMode();

  const capabilities = services.application?.capabilities;
  const securityService = services.security;
  const upsellingService = services.securitySolution?.getUpselling();
  const uiActionsService = services.uiActions;

  if (!capabilities || !securityService || !upsellingService || !uiActionsService) {
    return null;
  }

  return (
    <>
      <KibanaRenderContextProvider {...services}>
        <EuiThemeProvider darkMode={isDarkMode}>
          <Router history={history}>
            <AppRoutes subPluginRoutes={routes} services={services} />
          </Router>
        </EuiThemeProvider>
      </KibanaRenderContextProvider>
    </>
  );
};

const App = React.memo(AppComponent);

export interface AppRoutesProps {
  services: StartServices;
  subPluginRoutes: RouteProps[];
}

export const AppRoutes: React.FC<AppRoutesProps> = React.memo(({ services, subPluginRoutes }) => (
  <Routes>
    <Route path={`${APP_PATH}/get_started`}>
      <div>xcvxcvxvxcvxcvcxvxcvxv</div>
    </Route>
  </Routes>
));
AppRoutes.displayName = 'AppRoutes';

export const renderApp = ({ element, services, theme$, history }: RenderAppProps): (() => void) => {
  render(<App services={services} theme$={theme$} history={history} />, element);

  return () => unmountComponentAtNode(element);
};
