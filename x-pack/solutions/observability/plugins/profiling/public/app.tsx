/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { CheckSetup } from './components/check_setup';
import { ProfilingDependenciesContextProvider } from './components/contexts/profiling_dependencies/profiling_dependencies_context';
import { RouteBreadcrumbsContextProvider } from './components/contexts/route_breadcrumbs_context';
import { TimeRangeContextProvider } from './components/contexts/time_range_context';
import { RedirectWithDefaultDateRange } from './components/redirect_with_default_date_range';
import { profilingRouter } from './routing';
import type { Services } from './services';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';
import { ProfilingHeaderActionMenu } from './components/profiling_header_action_menu';
import { RouterErrorBoundary } from './routing/router_error_boundary';
import { LicenseProvider } from './components/contexts/license/license_context';
import { ProfilingSetupStatusContextProvider } from './components/contexts/profiling_setup_status/profiling_setup_status_context';

interface Props {
  profilingFetchServices: Services;
  coreStart: CoreStart;
  coreSetup: CoreSetup;
  pluginsStart: ProfilingPluginPublicStartDeps;
  pluginsSetup: ProfilingPluginPublicSetupDeps;
  theme$: AppMountParameters['theme$'];
  history: AppMountParameters['history'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const storage = new Storage(localStorage);

function MountProfilingActionMenu({
  theme$,
  setHeaderActionMenu,
}: {
  theme$: AppMountParameters['theme$'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}) {
  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <ProfilingHeaderActionMenu />
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}

function App({
  coreStart,
  coreSetup,
  pluginsStart,
  pluginsSetup,
  profilingFetchServices,
  theme$,
  history,
  setHeaderActionMenu,
}: Props) {
  const i18nCore = coreStart.i18n;

  const profilingDependencies = useMemo(() => {
    return {
      start: {
        core: coreStart,
        ...pluginsStart,
      },
      setup: {
        core: coreSetup,
        ...pluginsSetup,
      },
      services: profilingFetchServices,
    };
  }, [coreStart, coreSetup, pluginsStart, pluginsSetup, profilingFetchServices]);

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...coreStart, ...pluginsStart, storage }}>
        <i18nCore.Context>
          <RedirectAppLinks coreStart={coreStart} currentAppId="profiling">
            <RouterProvider router={profilingRouter as any} history={history}>
              <PerformanceContextProvider>
                <RouterErrorBoundary>
                  <TimeRangeContextProvider>
                    <ProfilingDependenciesContextProvider value={profilingDependencies}>
                      <ProfilingSetupStatusContextProvider>
                        <LicenseProvider>
                          <>
                            <CheckSetup>
                              <RedirectWithDefaultDateRange>
                                <RouteBreadcrumbsContextProvider>
                                  <RouteRenderer />
                                </RouteBreadcrumbsContextProvider>
                              </RedirectWithDefaultDateRange>
                            </CheckSetup>
                            <MountProfilingActionMenu
                              setHeaderActionMenu={setHeaderActionMenu}
                              theme$={theme$}
                            />
                          </>
                        </LicenseProvider>
                      </ProfilingSetupStatusContextProvider>
                    </ProfilingDependenciesContextProvider>
                  </TimeRangeContextProvider>
                </RouterErrorBoundary>
              </PerformanceContextProvider>
            </RouterProvider>
          </RedirectAppLinks>
        </i18nCore.Context>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<App {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
