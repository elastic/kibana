/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy } from 'react';
import ReactDOM from 'react-dom';
import {
  type AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { AI_ASSISTANT_APP_ID } from '@kbn/deeplinks-observability';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import { createAppService } from '@kbn/ai-assistant';
import { withSuspense } from '@kbn/shared-ux-utility';
import { combineLatest, map } from 'rxjs';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { WORKSPACE_SIDEBAR_APP_AI_ASSISTANT } from '@kbn/core-chrome-browser';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
} from './types';
import { getObsAIAssistantConnectorType } from './rule_connector';
import { SharedProviders } from './utils/shared_providers';
import { getVisibility } from './hooks/is_nav_control_visible';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}

export class ObservabilityAIAssistantAppPlugin
  implements
    Plugin<
      ObservabilityAIAssistantAppPublicSetup,
      ObservabilityAIAssistantAppPublicStart,
      ObservabilityAIAssistantAppPluginSetupDependencies,
      ObservabilityAIAssistantAppPluginStartDependencies
    >
{
  logger: Logger;
  appService: AIAssistantAppService | undefined;
  isServerless: boolean;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    coreSetup: CoreSetup,
    _: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppPublicSetup {
    coreSetup.application.register({
      id: AI_ASSISTANT_APP_ID,
      title: i18n.translate('xpack.observabilityAiAssistant.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observabilityAIAssistant',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices() as Promise<
            [CoreStart, ObservabilityAIAssistantAppPluginStartDependencies, unknown]
          >,
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            service={this.appService!}
            coreStart={coreStart}
            pluginsStart={pluginsStart as ObservabilityAIAssistantAppPluginStartDependencies}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppPublicStart {
    const appService = (this.appService = createAppService({
      pluginsStart,
    }));

    const isEnabled = appService.isEnabled();

    if (isEnabled) {
      let currentVisibility = false;

      combineLatest([
        coreStart.application.currentAppId$,
        coreStart.application.applications$,
        pluginsStart.aiAssistantManagementSelection.aiAssistantType$,
        pluginsStart.spaces.getActiveSpace$(),
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
          'aria-label': 'Observability AI Assistant',
        },
        app: {
          title: 'Observability AI Assistant',
          color: 'plain',
          isScrollable: false,
          hasBorder: true,
          containerPadding: 'none',
          children: <>{/* I need the chat component here */}</>,
        },
      });
    }

    const service = pluginsStart.observabilityAIAssistant.service;

    service.register(async ({ registerRenderFunction }) => {
      const { registerFunctions } = await import('./functions');

      await registerFunctions({ pluginsStart, registerRenderFunction });
    });

    const withProviders = <P extends {}, R = {}>(Component: React.ComponentType<P>) =>
      React.forwardRef((props: P, ref: React.Ref<R>) => (
        <SharedProviders
          coreStart={coreStart}
          pluginsStart={pluginsStart}
          service={service}
          theme$={coreStart.theme.theme$}
        >
          <Component {...props} ref={ref} />
        </SharedProviders>
      ));

    const LazilyLoadedRootCauseAnalysisContainer = withSuspense(
      withProviders(
        lazy(() =>
          import('./components/rca/rca_container').then((m) => ({
            default: m.RootCauseAnalysisContainer,
          }))
        )
      )
    );

    pluginsStart.triggersActionsUi.actionTypeRegistry.register(
      getObsAIAssistantConnectorType(service)
    );
    return {
      RootCauseAnalysisContainer: LazilyLoadedRootCauseAnalysisContainer,
    };
  }
}
