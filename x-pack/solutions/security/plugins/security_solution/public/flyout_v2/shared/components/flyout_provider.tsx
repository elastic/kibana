/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { History } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { Store } from 'redux';
import { Provider } from 'react-redux';
import { CellActionsProvider } from '@kbn/cell-actions';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import type { StartServices } from '../../../types';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';
import { KibanaContextProvider } from '../../../common/lib/kibana';
import { UserPrivilegesProvider } from '../../../common/components/user_privileges/user_privileges_context';
import { UpsellingProvider } from '../../../common/components/upselling_provider';
import { DiscoverInTimelineContextProvider } from '../../../common/components/discover_in_timeline/provider';
import { AssistantProvider } from '../../../assistant/provider';
import { CaseProvider } from '../../../cases/components/provider/provider';

// The exception builder still has styled-components descendants that read `theme.eui.*`.
// Keep this bridge until those forms are fully migrated to Emotion/EUI theme hooks.
const StyledComponentsThemeProvider = ({ children }: { children: ReactNode }) => {
  const darkMode = useDarkMode();
  return <EuiThemeProvider darkMode={darkMode}>{children}</EuiThemeProvider>;
};

export const flyoutProviders = ({
  services,
  store,
  children,
  history,
}: {
  services: StartServices;
  store: Store;
  children: ReactNode;
  history?: History;
}): ReactElement => {
  // This is currently necessary because of Analyzer (which internally has the logic to open other flyouts)
  // TODO remove ExpandableFlyoutProvider when we're ready to drop the expandable flyout
  const flyoutContent = history ? (
    <Router history={history}>
      <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
    </Router>
  ) : (
    <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
  );

  return (
    <KibanaContextProvider services={services}>
      <StyledComponentsThemeProvider>
        <CellActionsProvider
          getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
        >
          <NavigationProvider core={services}>
            <Provider store={store}>
              <ReactQueryClientProvider>
                <UserPrivilegesProvider kibanaCapabilities={services.application.capabilities}>
                  <UpsellingProvider upsellingService={services.upselling}>
                    <DiscoverInTimelineContextProvider>
                      <CaseProvider>
                        <AssistantProvider>{flyoutContent}</AssistantProvider>
                      </CaseProvider>
                    </DiscoverInTimelineContextProvider>
                  </UpsellingProvider>
                </UserPrivilegesProvider>
              </ReactQueryClientProvider>
            </Provider>
          </NavigationProvider>
        </CellActionsProvider>
      </StyledComponentsThemeProvider>
    </KibanaContextProvider>
  );
};
