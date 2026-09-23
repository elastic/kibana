/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  TEMPLATE_ID_INVESTIGATION,
} from '@kbn/alertzero-common';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
} from '@kbn/agentic-investigations-plugin/common';
import React from 'react';
import { registerAgenticInvestigationTemplateUI } from '@kbn/agentic-investigations-common';
import { getAlertZeroDeepLinks } from './deep_links';
import { registerAlertZeroAttachmentTypesUI } from './agent_builder/attachment_types';
import { EscalationModalBoundary } from './pages/conversations/escalation_modal_boundary';
import type {
  AlertZeroClientConfig,
  AlertZeroPublicSetup,
  AlertZeroPublicStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';

// Kept as a literal rather than `ALERTZERO_PLUGIN_NAME`: the i18n extractor only reads
// string literals, so a constant reference here would silently drop the message.
const APP_TITLE = i18n.translate('xpack.alertzero.appTitle', {
  defaultMessage: 'AlertZero',
});

const INVESTIGATION_TEMPLATE_NAME = i18n.translate('xpack.alertzero.conversationTemplate.name', {
  defaultMessage: 'Investigation',
});

export class AlertZeroPublicPlugin
  implements
    Plugin<
      AlertZeroPublicSetup,
      AlertZeroPublicStart,
      AlertZeroSetupDependencies,
      AlertZeroStartDependencies
    >
{
  private readonly config: AlertZeroClientConfig;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<AlertZeroClientConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPublicStart>,
    _setupDeps: AlertZeroSetupDependencies
  ): AlertZeroPublicSetup {
    if (!this.config.enabled) {
      return {};
    }

    coreSetup.application.register({
      id: ALERTZERO_APP_ID,
      title: APP_TITLE,
      appRoute: ALERTZERO_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'securitySignalDetected',
      status: AppStatus.accessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 101,
      deepLinks: getAlertZeroDeepLinks(),
      mount: async (params) => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          coreStart,
          startDeps,
          params,
        });
      },
    });

    return {};
  }

  public start(core: CoreStart, startDeps: AlertZeroStartDependencies): AlertZeroPublicStart {
    if (!this.config.enabled) {
      return {};
    }

    // Lazy-load the entire escalation modal subtree — only resolved when the modal is first opened.
    // This keeps KibanaContextProvider, QueryClient, and ConnectedEscalationModal (plus all their
    // EUI and hook dependencies) out of alertzero's main chunk.
    const LazyEscalationModal = React.lazy(async () => {
      const [
        { KibanaContextProvider },
        { QueryClient, QueryClientProvider },
        { ConnectedEscalationModal },
      ] = await Promise.all([
        import('@kbn/kibana-react-plugin/public'),
        import('@kbn/react-query'),
        import('./pages/conversations/connected_escalation_modal'),
      ]);

      // Both `flyoutQueryClient` and `stableServices` are created once inside the lazy factory
      // so they are stable across renders. KibanaContextProvider compares `services` by reference;
      // a spread inside the component body would create a new object on every render and
      // cause all consumers to re-render unnecessarily.
      const flyoutQueryClient = new QueryClient();
      const stableServices = { ...core, ...startDeps };

      const WrappedModal: React.FC<React.ComponentProps<typeof ConnectedEscalationModal>> = (
        props
      ) =>
        React.createElement(
          KibanaContextProvider,
          { services: stableServices },
          React.createElement(
            QueryClientProvider,
            { client: flyoutQueryClient },
            React.createElement(ConnectedEscalationModal, props)
          )
        );

      return { default: WrappedModal };
    });

    const canManageEscalations =
      core.application.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
        ESCALATIONS_UI_CAPABILITY_MANAGE
      ] === true;

    registerAgenticInvestigationTemplateUI({
      conversationTemplates: startDeps.agentBuilder.conversationTemplates,
      templateId: TEMPLATE_ID_INVESTIGATION,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'securitySignalDetected',
      renderEscalationModal: canManageEscalations
        ? (props) =>
            React.createElement(
              EscalationModalBoundary,
              null,
              React.createElement(LazyEscalationModal, props)
            )
        : undefined,
    });

    // Space id comes from the base path so registration starts synchronously.
    const { spaceId } = getSpaceIdFromPath(
      core.http.basePath.get(),
      core.http.basePath.serverBasePath
    );

    registerAlertZeroAttachmentTypesUI(startDeps.agentBuilder.attachments, {
      http: core.http,
      navigation: {
        share: startDeps.share,
        spaceId,
        prependPath: (path) => core.http.basePath.prepend(path),
        getUrlForApp: core.application.getUrlForApp,
      },
    }).catch((error) => {
      this.logger.error('Failed to register AlertZero attachment UI definitions', error);
    });

    return {};
  }

  public stop() {}
}
