/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { AssistantOverlay } from '@kbn/elastic-assistant';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AssistantNavLink } from '@kbn/elastic-assistant/impl/assistant_context/assistant_nav_link';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { NavigationProvider } from '@kbn/security-solution-navigation';
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

    coreStart.chrome.navControls.registerRight({
      order: 1001,
      mount: (target) => {
        const startService = startServices();
        return this.mountAIAssistantButton(target, coreStart, startService);
      },
    });

    return {};
  }

  private mountAIAssistantButton(
    targetDomElement: HTMLElement,
    coreStart: CoreStart,
    services: StartServices
  ) {
    const { openChat$, completeOpenChat } = services.aiAssistantManagementSelection;
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider
          services={{
            appName: 'securitySolution',
            ...services,
          }}
        >
          <KibanaThemeProvider {...coreStart}>
            <NavigationProvider core={services}>
              <ReactQueryClientProvider>
                <AssistantSpaceIdProvider>
                  <AssistantProvider
                    isServerless={this.isServerless}
                    openChatTrigger$={openChat$}
                    completeOpenChat={completeOpenChat}
                  >
                    <Suspense fallback={null}>
                      <AssistantNavLink />
                      <AssistantOverlay />
                    </Suspense>
                  </AssistantProvider>
                </AssistantSpaceIdProvider>
              </ReactQueryClientProvider>
            </NavigationProvider>
          </KibanaThemeProvider>
        </KibanaContextProvider>
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }

  public stop() {
    // Cleanup when plugin is stopped
  }
}
