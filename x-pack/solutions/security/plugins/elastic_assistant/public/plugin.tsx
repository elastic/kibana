/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import { createHashHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { AssistantOverlay, OneChatOverlay } from '@kbn/elastic-assistant';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AssistantNavLink } from '@kbn/elastic-assistant/impl/assistant_context/assistant_nav_link';
import { OneChatNavLink } from '@kbn/elastic-assistant/impl/assistant_context/one_chat_nav_link';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { SecurityAlertReference } from './src/components/get_comments/content_reference/components/security_alert_reference';
import { SecurityAlertsPageReference } from './src/components/get_comments/content_reference/components/security_alerts_page_reference';
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

  public setup(coreSetup: CoreSetup) {
    this.telemetry.setup({ analytics: coreSetup.analytics });
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantPublicPluginStartDependencies) {
    // Register security alert components with onechat content reference registry
    dependencies.onechat.contentReferenceRegistry.register('SecurityAlert', SecurityAlertReference);
    dependencies.onechat.contentReferenceRegistry.register('SecurityAlertsPage', SecurityAlertsPageReference);

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
        onechat: dependencies.onechat,
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
    const history = createHashHistory();
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
                  <AssistantProvider>
                    <Suspense fallback={null}>
                      <AssistantNavLink />
                      <Router history={history}>
                        <span> </span>
                        <OneChatNavLink />
                        <OneChatOverlay />
                      </Router>
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
