/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import { Provider } from 'react-redux';
import { Router } from '@kbn/shared-ux-router';
import type { History } from 'history';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { Store } from 'redux';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { UpsellingProvider } from '../../components/upselling_provider';
import { ConsoleManager } from '../../../management/components/console';
import { MockAssistantProvider } from '../mock_assistant_provider';
import { RouteCapture } from '../../components/endpoint/route_capture';
import type { StartPlugins, StartServices } from '../../../types';

/**
 * Provides the context for rendering the endpoint app
 */
export const AppRootProvider = memo<{
  store: Store;
  history: History;
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  startServices: StartServices;
  queryClient: QueryClient;
  children: ReactNode | ReactNode[];
}>(({ store, history, coreStart, depsStart, queryClient, startServices, children }) => {
  const isDarkMode = useKibanaIsDarkMode();
  const services = useMemo(() => {
    return {
      ...depsStart,
      ...startServices,
    };
  }, [depsStart, startServices]);

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <Provider store={store}>
        <KibanaContextProvider services={services}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <QueryClientProvider client={queryClient}>
              <UpsellingProvider upsellingService={startServices.upselling}>
                <MockAssistantProvider>
                  <NavigationProvider core={coreStart}>
                    <Router history={history}>
                      <ConsoleManager>
                        <RouteCapture>{children}</RouteCapture>
                      </ConsoleManager>
                    </Router>
                  </NavigationProvider>
                </MockAssistantProvider>
              </UpsellingProvider>
            </QueryClientProvider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      </Provider>
    </KibanaRenderContextProvider>
  );
});

AppRootProvider.displayName = 'AppRootProvider';
