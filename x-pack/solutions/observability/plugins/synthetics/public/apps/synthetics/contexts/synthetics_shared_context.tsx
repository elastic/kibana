/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Provider as ReduxProvider } from 'react-redux';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { Subject } from 'rxjs';
import type { Store } from 'redux';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { SyntheticsRefreshContextProvider } from './synthetics_refresh_context';
import { SyntheticsDataViewContextProvider } from './synthetics_data_view_context';
import type { SyntheticsAppProps } from './synthetics_settings_context';
import { storage, store } from '../state';
const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const SyntheticsSharedContext: React.FC<
  React.PropsWithChildren<SyntheticsAppProps & { reload$?: Subject<boolean>; reduxStore?: Store }>
> = ({ reduxStore, coreStart, setupPlugins, startPlugins, children, darkMode, reload$ }) => {
  const queryClient = new QueryClient();

  const spacesApi = startPlugins.spaces;

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...setupPlugins,
        storage,
        contentManagement: startPlugins.contentManagement,
        data: startPlugins.data,
        inspector: startPlugins.inspector,
        triggersActionsUi: startPlugins.triggersActionsUi,
        observability: startPlugins.observability,
        observabilityShared: startPlugins.observabilityShared,
        observabilityAIAssistant: startPlugins.observabilityAIAssistant,
        exploratoryView: startPlugins.exploratoryView,
        cases: startPlugins.cases,
        spaces: startPlugins.spaces,
        fleet: startPlugins.fleet,
        share: startPlugins.share,
        kql: startPlugins.kql,
        unifiedSearch: startPlugins.unifiedSearch,
        embeddable: startPlugins.embeddable,
        slo: startPlugins.slo,
        serverless: startPlugins.serverless,
        charts: startPlugins.charts,
        uiActions: startPlugins.uiActions,
      }}
    >
      <EuiThemeProvider darkMode={darkMode}>
        <ReduxProvider store={reduxStore ?? store}>
          <QueryClientProvider client={queryClient}>
            <SyntheticsRefreshContextProvider reload$={reload$}>
              <SyntheticsDataViewContextProvider dataViews={startPlugins.dataViews}>
                <RedirectAppLinks
                  coreStart={{
                    application: coreStart.application,
                  }}
                  style={{
                    height: '100%',
                  }}
                >
                  <ContextWrapper>{children}</ContextWrapper>
                </RedirectAppLinks>
              </SyntheticsDataViewContextProvider>
            </SyntheticsRefreshContextProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
};
