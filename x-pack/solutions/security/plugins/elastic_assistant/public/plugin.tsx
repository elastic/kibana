/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import React, { Suspense } from 'react';
import { Assistant } from '@kbn/elastic-assistant';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { WORKSPACE_SIDEBAR_APP_AI_ASSISTANT } from '@kbn/core-chrome-browser';
import { combineLatest, map } from 'rxjs';
import type {
  ElasticAssistantPublicPluginSetupDependencies,
  ElasticAssistantPublicPluginStartDependencies,
  StartServices,
} from './types';
import { AssistantProvider } from './src/context/assistant_context/assistant_provider';
import { KibanaContextProvider } from './src/context/typed_kibana_context/typed_kibana_context';
import { licenseService } from './src/hooks/licence/use_licence';
import { ReactQueryClientProvider } from './src/context/query_client_context/elastic_assistant_query_client_provider';
import { AssistantSpaceIdProvider } from './src/context/assistant_space_id/assistant_space_id_provider';
import { TelemetryService } from './src/common/lib/telemetry/telemetry_service';
import { getVisibility } from './src/hooks/is_nav_control_visible/use_is_nav_control_visible';

export type ElasticAssistantPublicPluginSetup = ReturnType<ElasticAssistantPublicPlugin['setup']>;
export type ElasticAssistantPublicPluginStart = ReturnType<ElasticAssistantPublicPlugin['start']>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}

export class ElasticAssistantPublicPlugin
  implements
    Plugin<
      ElasticAssistantPublicPluginSetup,
      ElasticAssistantPublicPluginStart,
      ElasticAssistantPublicPluginSetupDependencies,
      ElasticAssistantPublicPluginStartDependencies
    >
{
  private readonly storage = new Storage(localStorage);
  private readonly telemetry: TelemetryService = new TelemetryService();
  isServerless: boolean;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(coreSetup: CoreSetup) {
    this.telemetry.setup({ analytics: coreSetup.analytics });
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantPublicPluginStartDependencies) {
    const startServices = (): StartServices => {
      const { ...startPlugins } = coreStart.security;
      licenseService.start(dependencies.licensing.license$);
      const telemetry = this.telemetry.start();

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        licensing: dependencies.licensing,
        triggersActionsUi: dependencies.triggersActionsUi,
        security: dependencies.security,
        telemetry,
        productDocBase: dependencies.productDocBase,
        storage: this.storage,
        discover: dependencies.discover,
        spaces: dependencies.spaces,
        elasticAssistantSharedState: dependencies.elasticAssistantSharedState,
        aiAssistantManagementSelection: dependencies.aiAssistantManagementSelection,
      };
      return services;
    };

    const ContextWrapper = ({
      children,
      isServerless,
    }: {
      children: React.ReactNode;
      isServerless: boolean;
    }) => {
      const services = startServices();
      const { openChat$, completeOpenChat } = services.aiAssistantManagementSelection;
      return (
        <KibanaContextProvider
          services={{
            appName: 'securitySolution',
            ...services,
          }}
        >
          <NavigationProvider core={services}>
            <ReactQueryClientProvider>
              <AssistantSpaceIdProvider>
                <AssistantProvider
                  isServerless={isServerless}
                  openChatTrigger$={openChat$}
                  completeOpenChat={completeOpenChat}
                >
                  <Suspense fallback={null}>{children}</Suspense>
                </AssistantProvider>
              </AssistantSpaceIdProvider>
            </ReactQueryClientProvider>
          </NavigationProvider>
        </KibanaContextProvider>
      );
    };

    const services = startServices();

    // Create a reactive isAvailable function that combines the observables
    let currentVisibility = false;

    combineLatest([
      services.application.currentAppId$,
      services.application.applications$,
      services.aiAssistantManagementSelection.aiAssistantType$,
      services.spaces.getActiveSpace$(),
    ])
      .pipe(
        map(([appId, applications, preferredAssistantType, space]) => {
          return getVisibility(
            appId,
            applications,
            preferredAssistantType,
            space,
            this.isServerless
          );
        })
      )
      .subscribe((visibility) => {
        currentVisibility = visibility;
      });

    coreStart.chrome.workspace.sidebar.registerSidebarApp({
      appId: WORKSPACE_SIDEBAR_APP_AI_ASSISTANT,
      size: 'wide',
      isAvailable: () => currentVisibility,
      button: {
        iconType: AssistantIcon,
        'aria-label': 'Elastic Assistant',
        wrapper: (button) => (
          <ContextWrapper isServerless={this.isServerless}>{button}</ContextWrapper>
        ),
      },
      app: {
        title: 'Elastic Assistant',
        color: 'plain',
        isScrollable: false,
        hasBorder: true,
        containerPadding: 'none',
        children: (
          <ContextWrapper isServerless={this.isServerless}>
            <Assistant />
          </ContextWrapper>
        ),
      },
    });

    return {};
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
