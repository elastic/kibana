/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { CoreStart } from '@kbn/core/public';
import type { SecuritySolutionAppWrapperFeature } from '@kbn/discover-shared-plugin/public';
import type { DiscoverServices } from '@kbn/discover-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import { APP_ID } from '../../../common';
import { SecuritySolutionFlyout } from '../../flyout';
import { StatefulEventContext } from '../../common/components/events_viewer/stateful_event_context';
import type { SecurityAppStore } from '../../common/store';
import { ReactQueryClientProvider } from '../../common/containers/query_client/query_client_provider';
import type { StartPluginsDependencies, StartServices } from '../../types';
import { MlCapabilitiesProvider } from '../../common/components/ml/permissions/ml_capabilities_provider';
import { UserPrivilegesProvider } from '../../common/components/user_privileges/user_privileges_context';
import { DiscoverInTimelineContextProvider } from '../../common/components/discover_in_timeline/provider';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { ConsoleManager } from '../../management/components/console';
import { AssistantProvider } from '../../assistant/provider';
import { ONE_DISCOVER_SCOPE_ID } from '../constants';

export const createSecuritySolutionDiscoverAppWrapperGetter = ({
  core,
  services,
  plugins,
  store,
}: {
  core: CoreStart;
  services: StartServices;
  plugins: StartPluginsDependencies;
  /**
   * instance of Security App store that should be used in Discover
   */
  store: SecurityAppStore;
}) => {
  const getSecuritySolutionDiscoverAppWrapper: Awaited<
    ReturnType<SecuritySolutionAppWrapperFeature['getWrapper']>
  > = () => {
    return function SecuritySolutionDiscoverAppWrapper({ children }) {
      const { services: discoverServices } = useKibana<DiscoverServices>();
      const CasesContext = useMemo(() => plugins.cases.ui.getCasesContext(), []);

      const userCasesPermissions = useMemo(() => plugins.cases.helpers.canUseCases([APP_ID]), []);

      /**
       *
       * Since this component is meant to be used only in the context of Discover,
       * these services are appended/overwritten to the existing services object
       * provided by the Discover plugin.
       *
       */
      const securitySolutionServices: StartServices = useMemo(
        () => ({
          ...services,
          /* Helps with getting correct instance of query, timeFilter and filterManager instances from discover */
          data: discoverServices.data,
        }),
        [discoverServices]
      );

      const statefulEventContextValue = useMemo(
        () => ({
          // timelineId acts as scopeId
          timelineID: ONE_DISCOVER_SCOPE_ID,
          enableHostDetailsFlyout: true,
          /* behaviour similar to query tab */
          tabType: 'query',
          enableIpDetailsFlyout: true,
        }),
        []
      );

      return (
        <KibanaContextProvider services={securitySolutionServices}>
          <EuiThemeProvider>
            <MlCapabilitiesProvider>
              <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
                <UserPrivilegesProvider kibanaCapabilities={services.application.capabilities}>
                  {/* ^_^ Needed for notes addition */}
                  <NavigationProvider core={core}>
                    <CellActionsProvider
                      getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
                    >
                      {/* ^_^ Needed for Cell Actions since it gives errors when CellActionsContext is used */}
                      <UpsellingProvider upsellingService={services.upselling}>
                        {/* ^_^ Needed for Alert Preview from Expanded Section of Entity Flyout */}
                        <ReduxStoreProvider store={store}>
                          <ReactQueryClientProvider>
                            <ConsoleManager>
                              {/* ^_^ Needed for AlertPreview -> Alert Details Flyout Action */}
                              <AssistantProvider>
                                {/* ^_^ Needed for AlertPreview -> Alert Details Flyout Action */}
                                <DiscoverInTimelineContextProvider>
                                  {/* ^_^ Needed for Add to Timeline action by `useRiskInputActions`*/}
                                  <ExpandableFlyoutProvider>
                                    <SecuritySolutionFlyout />
                                    {/* vv below context should not be here and should be removed */}
                                    <StatefulEventContext.Provider
                                      value={statefulEventContextValue}
                                    >
                                      {children}
                                    </StatefulEventContext.Provider>
                                  </ExpandableFlyoutProvider>
                                </DiscoverInTimelineContextProvider>
                              </AssistantProvider>
                            </ConsoleManager>
                          </ReactQueryClientProvider>
                        </ReduxStoreProvider>
                      </UpsellingProvider>
                    </CellActionsProvider>
                  </NavigationProvider>
                </UserPrivilegesProvider>
              </CasesContext>
            </MlCapabilitiesProvider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );
    };
  };

  return getSecuritySolutionDiscoverAppWrapper;
};
