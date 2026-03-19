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
import type { StartServices } from '../../../types';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';
import { KibanaContextProvider } from '../../../common/lib/kibana';

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
      <CellActionsProvider
        getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
      >
        <NavigationProvider core={services}>
          <Provider store={store}>
            <ReactQueryClientProvider>{flyoutContent}</ReactQueryClientProvider>
          </Provider>
        </NavigationProvider>
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
