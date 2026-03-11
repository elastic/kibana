/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
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
import type { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { HeaderActionMenuProvider } from '../containers/header_action_menu_provider';
import { TriggersActionsProvider } from '../containers/triggers_actions_context';

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
}

export const CoreProviders: FC<PropsWithChildren<CoreProvidersProps>> = ({
  children,
  core,
  pluginStart,
  plugins,
  kibanaEnvironment,
}) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  const KibanaEnvContextForPluginProvider = useKibanaEnvironmentContextProvider(kibanaEnvironment);

  return (
    <KibanaRenderContextProvider {...core}>
      <RedirectAppLinks
        coreStart={{
          application: core.application,
        }}
      >
        <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
          <KibanaEnvContextForPluginProvider kibanaEnv={kibanaEnvironment}>
            {children}
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
