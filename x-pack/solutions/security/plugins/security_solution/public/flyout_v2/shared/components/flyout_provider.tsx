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
import useObservable from 'react-use/lib/useObservable';
import { CellActionsProvider } from '@kbn/cell-actions';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import type { StartServices } from '../../../types';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';
import { KibanaContextProvider } from '../../../common/lib/kibana';

const AssistantFlyoutProvider = ({
  children,
  services,
}: {
  children: ReactNode;
  services: StartServices;
}) => {
  const assistantContextValue = useObservable(
    services.elasticAssistantSharedState.assistantContextValue.getAssistantContextValue$()
  );

  if (!assistantContextValue) {
    return null;
  }

  return (
    <ElasticAssistantProvider value={assistantContextValue}>{children}</ElasticAssistantProvider>
  );
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
      <CellActionsProvider
        getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
      >
        <Provider store={store}>
          <ReactQueryClientProvider>
            <AssistantFlyoutProvider services={services}>{flyoutContent}</AssistantFlyoutProvider>
          </ReactQueryClientProvider>
        </Provider>
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
