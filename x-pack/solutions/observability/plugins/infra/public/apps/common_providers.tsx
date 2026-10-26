/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { NavigationWarningPromptProvider } from '@kbn/observability-shared-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme/hooks';
import {
  type KibanaEnvContext,
  useKibanaContextForPluginProvider,
  useKibanaEnvironmentContextProvider,
} from '../hooks/use_kibana';
import { ReloadRequestTimeProvider } from '../hooks/use_reload_request_time';
import type { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { CpsProjectRoutingSync } from '../components/cps_project_routing_sync';
import { HeaderActionMenuProvider } from '../containers/header_action_menu_provider';
import { TriggersActionsProvider } from '../containers/triggers_actions_context';
import { wrapHttpWithProjectRouting } from '../utils/wrap_http_with_project_routing';

export const CommonInfraProviders: FC<
  PropsWithChildren<{
    appName: string;
    storage: Storage;
    triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    theme$: AppMountParameters['theme$'];
  }>
> = ({ children, triggersActionsUI, setHeaderActionMenu, appName, storage, theme$ }) => {
  const darkMode = useKibanaIsDarkMode();

  return (
    <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
      <EuiThemeProvider darkMode={darkMode}>
        <DataUIProviders appName={appName} storage={storage}>
          <HeaderActionMenuProvider setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
            <NavigationWarningPromptProvider>{children}</NavigationWarningPromptProvider>
          </HeaderActionMenuProvider>
        </DataUIProviders>
      </EuiThemeProvider>
    </TriggersActionsProvider>
  );
};

export interface CoreProvidersProps {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
  kibanaEnvironment?: KibanaEnvContext;
  /** When true, attach `x-project-routing` to Infra HTTP calls and refresh on CPS changes. */
  infraCPSEnabled?: boolean;
}

export const CoreProviders: FC<PropsWithChildren<CoreProvidersProps>> = ({
  children,
  core,
  pluginStart,
  plugins,
  kibanaEnvironment,
  infraCPSEnabled = false,
}) => {
  const coreForCps = useMemo(() => {
    if (!infraCPSEnabled || !plugins.cps?.cpsManager) {
      return core;
    }
    return {
      ...core,
      http: wrapHttpWithProjectRouting(core.http, () => plugins.cps?.cpsManager),
    };
  }, [core, plugins, infraCPSEnabled]);

  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    coreForCps,
    plugins,
    pluginStart
  );

  const KibanaEnvContextForPluginProvider = useKibanaEnvironmentContextProvider(kibanaEnvironment);

  const shouldSyncCpsRouting = infraCPSEnabled && Boolean(plugins.cps?.cpsManager);

  return (
    <KibanaRenderContextProvider {...coreForCps}>
      <RedirectAppLinks
        coreStart={{
          application: coreForCps.application,
        }}
      >
        <KibanaContextProviderForPlugin services={{ ...coreForCps, ...plugins, ...pluginStart }}>
          <KibanaEnvContextForPluginProvider kibanaEnv={kibanaEnvironment}>
            <ReloadRequestTimeProvider>
              {shouldSyncCpsRouting ? <CpsProjectRoutingSync /> : null}
              {children}
            </ReloadRequestTimeProvider>
          </KibanaEnvContextForPluginProvider>
        </KibanaContextProviderForPlugin>
      </RedirectAppLinks>
    </KibanaRenderContextProvider>
  );
};

const DataUIProviders: FC<
  PropsWithChildren<{
    appName: string;
    storage: Storage;
  }>
> = ({ appName, children, storage }) => (
  <KibanaContextProvider services={{ appName, storage }}>{children}</KibanaContextProvider>
);
