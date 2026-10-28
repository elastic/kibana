/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactElement, ReactNode } from 'react';
import React, { useEffect, useMemo } from 'react';
import type { History } from 'history';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import type { Store } from 'redux-v4';
import { Provider, useStore } from 'react-redux-v7';
import { CellActionsProvider } from '@kbn/cell-actions';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { EntityStoreEuidApiProvider } from '@kbn/entity-store/public';
import type { StartServices } from '../../../types';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';
import { KibanaContextProvider, useKibana } from '../../../common/lib/kibana';
import { UserPrivilegesProvider } from '../../../common/components/user_privileges/user_privileges_context';
import { UpsellingProvider } from '../../../common/components/upselling_provider';
import { DiscoverInTimelineContextProvider } from '../../../common/components/discover_in_timeline/provider';
import { AssistantProvider } from '../../../assistant/provider';
import { CaseProvider } from '../../../cases/components/provider/provider';
import { MlCapabilitiesProvider } from '../../../common/components/ml/permissions/ml_capabilities_provider';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { ConsoleManager } from '../../../management/components/console/components/console_manager';

/**
 * Seeds the Security Solution Redux `global` time range from Kibana's global time filter on mount.
 *
 * This is only needed when the flyout is rendered OUTSIDE the Security app (e.g. in Discover), where
 * the Security Redux `global` input is not otherwise populated. Inside the Security app that Redux
 * input is already the source of truth for the page's time range — and may hold a *relative* range
 * such as "Today". Seeding it from the timefilter there calls `getAbsoluteTime()` and would overwrite
 * the relative range with fixed timestamps on every flyout open (which then syncs to the URL), so we
 * skip it in the Security app.
 *
 * The guard is a SYNCHRONOUS `window.location.pathname` check, not an app-id observable
 * (`useIsInSecurityApp`): this effect runs once on mount, and an observable-based hook yields
 * `undefined` on the first render, so the destructive seed would run before the guard resolved.
 * The flyout renders in a separate React root (EUI flyout-manager portal), which makes that
 * first-render race reliably lose. The pathname is correct synchronously on mount regardless.
 */
const TimeRangeSync: FC<{ children: ReactNode }> = ({ children }) => {
  const { services } = useKibana();
  const store = useStore();

  useEffect(() => {
    if (window.location.pathname.includes('/app/security')) return;
    const tf = services.data.query.timefilter.timefilter;
    const { from, to } = tf.getAbsoluteTime();
    store.dispatch(setAbsoluteRangeDatePicker({ id: InputsModelId.global, from, to }));
  }, [services, store]);

  return <>{children}</>;
};

const useHasRouterContext = (): boolean => {
  try {
    useLocation();
    return true;
  } catch {
    return false;
  }
};

const FlyoutRouter: FC<{ children: ReactNode; history?: History }> = ({ children, history }) => {
  const hasRouterContext = useHasRouterContext();
  const fallbackHistory = useMemo(() => createMemoryHistory(), []);

  // Security app flyouts can be opened from inside an existing Router, while Discover can
  // render this provider without one. Reuse the host Router when present to avoid nesting.
  return hasRouterContext ? (
    <>{children}</>
  ) : (
    <Router history={history ?? fallbackHistory}>{children}</Router>
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
  // ConsoleManager and AssistantProvider must live inside the Router because the Respond
  // PageOverlay they render calls `useLocation()` (for `hideOnUrlPathnameChange`).
  const flyoutContent = (
    <FlyoutRouter history={history}>
      <ConsoleManager>
        <AssistantProvider>
          <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
        </AssistantProvider>
      </ConsoleManager>
    </FlyoutRouter>
  );

  return (
    <KibanaContextProvider services={services}>
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
                      <EntityStoreEuidApiProvider>
                        <MlCapabilitiesProvider>
                          <TimeRangeSync>{flyoutContent}</TimeRangeSync>
                        </MlCapabilitiesProvider>
                      </EntityStoreEuidApiProvider>
                    </CaseProvider>
                  </DiscoverInTimelineContextProvider>
                </UpsellingProvider>
              </UserPrivilegesProvider>
            </ReactQueryClientProvider>
          </Provider>
        </NavigationProvider>
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
