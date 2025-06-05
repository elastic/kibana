import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React from 'react'
import { ElasticAssistantPublicPluginSetupDependencies, ElasticAssistantPublicPluginStartDependencies, StartServices } from './types';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactQueryClientProvider } from './hooks/query_client/query_client_provider';
import { AssistantOverlay, AssistantSpaceIdProvider } from '@kbn/elastic-assistant';
import { licenseService } from './hooks/licence/use_licence';
import { AssistantProvider } from './hooks/assistant_provider/assistant_provider';
import { KibanaContextProvider } from './hooks/kibana/use_kibana';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiThemeProvider } from './context/eui_them_provider/eui_them_provider';

export type ElasticAssistantPublicPluginSetup = ReturnType<ElasticAssistantPublicPlugin['setup']>;
export type ElasticAssistantPublicPluginStart = ReturnType<ElasticAssistantPublicPlugin['start']>;

export class ElasticAssistantPublicPlugin implements Plugin<
  ElasticAssistantPublicPluginSetup,
  ElasticAssistantPublicPluginStart,
  ElasticAssistantPublicPluginSetupDependencies,
  ElasticAssistantPublicPluginStartDependencies> {
  private readonly version: string;
  private readonly storage = new Storage(localStorage);


  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    
    return {};
  }

  public start(coreStart: CoreStart, dependencies: ElasticAssistantPublicPluginStartDependencies) {

    const startServices = (): StartServices => {
      const { ...startPlugins } = coreStart.security;
      licenseService.start(dependencies.licensing.license$);

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        licensing: dependencies.licensing,
        triggersActionsUi: dependencies.triggersActionsUi,
        security: dependencies.security,
        telemetry: {} as unknown,
        productDocBase: dependencies.productDocBase,
        storage: this.storage,
      };
      return services;
    };

    // Return any functionality that should be available to other plugins at runtime

    coreStart.chrome.navControls.registerRight({
      order: 500,
      mount: (target) => {
        const startService = startServices();
        return this.mountAIAssistantButton(target, coreStart, startService);
      },
    });

    return {
      getVersion: () => this.version,
    };
  }

  private mountAIAssistantButton(
    targetDomElement: HTMLElement,
    coreStart: CoreStart,
    services: StartServices
  ) {
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider
          services={{
            appName: 'securitySolution',
            ...services,
          }}
        >
          <EuiThemeProvider>
            <ReactQueryClientProvider>
              <AssistantSpaceIdProvider spaceId={"spaceId"}>
                <AssistantProvider>
                  <AssistantOverlay />
                </AssistantProvider>
              </AssistantSpaceIdProvider>
            </ReactQueryClientProvider>
          </EuiThemeProvider>
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
