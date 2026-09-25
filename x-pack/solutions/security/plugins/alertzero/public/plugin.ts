/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_ESCALATION,
} from '@kbn/alertzero-common';
import React from 'react';
import {
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
  type RenderAssignees,
  type RenderLinkedInvestigations,
} from '@kbn/agentic-investigations-common';
import { getAgenticInvestigationsCapabilities } from './hooks/use_agentic_investigations_capabilities';
import { getAlertZeroDeepLinks } from './deep_links';
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

const ESCALATION_TEMPLATE_NAME = i18n.translate(
  'xpack.alertzero.escalationConversationTemplate.name',
  { defaultMessage: 'Escalation' }
);

const LINKED_INVESTIGATIONS_LOADING_LABEL = i18n.translate(
  'xpack.alertzero.linkedInvestigations.loading',
  { defaultMessage: 'Loading linked investigations…' }
);

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
  /**
   * Allows `start()` to push updated deep links (with capability-resolved visibility)
   * after capabilities become available, without re-registering the application.
   */
  private readonly appUpdater$ = new Subject<AppUpdater>();

  constructor(context: PluginInitializerContext<AlertZeroClientConfig>) {
    this.config = context.config.get();
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
      // Initial deep links without capability filtering — capabilities are not available at
      // setup. `start()` emits an update via appUpdater$ once capabilities are known.
      deepLinks: getAlertZeroDeepLinks(),
      updater$: this.appUpdater$,
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

    // Push capability-resolved deep links now that `core.application.capabilities` is available.
    this.appUpdater$.next(() => ({
      deepLinks: getAlertZeroDeepLinks(core.application.capabilities),
    }));

    // ---------------------------------------------------------------------------
    // Lazy provider wrapper
    // ---------------------------------------------------------------------------
    // Both the escalation modal and the assignee picker need to mount inside
    // KibanaContextProvider + QueryClientProvider. The factory is called once
    // per flyout-type so each gets its own isolated QueryClient. Wrapped lazily so
    // these heavy deps land in async chunks rather than the main bundle.

    /**
     * Returns a React.lazy factory that wraps `getComponent()` with providers.
     * Each call creates an independent QueryClient so caches don't bleed across flyouts.
     */
    const makeLazyWithProviders = <P extends object>(
      getComponent: () => Promise<React.ComponentType<P>>
    ): React.LazyExoticComponent<React.ComponentType<P>> => {
      return React.lazy(async () => {
        const [{ KibanaContextProvider }, { QueryClient, QueryClientProvider }, Component] =
          await Promise.all([
            import('@kbn/kibana-react-plugin/public'),
            import('@kbn/react-query'),
            getComponent(),
          ]);

        const queryClient = new QueryClient();
        const stableServices = { ...core, ...startDeps };

        const Wrapped: React.FC<P> = (props) =>
          React.createElement(
            KibanaContextProvider,
            { services: stableServices },
            React.createElement(
              QueryClientProvider,
              { client: queryClient },
              React.createElement(Component, props)
            )
          );

        return { default: Wrapped };
      });
    };

    // ---------------------------------------------------------------------------
    // Escalation creation modal (opened from the investigation flyout footer)
    // ---------------------------------------------------------------------------
    const LazyEscalationModal = makeLazyWithProviders(async () => {
      const { ConnectedEscalationModal } = await import(
        './pages/conversations/connected_escalation_modal'
      );
      return ConnectedEscalationModal as React.ComponentType<
        React.ComponentProps<typeof ConnectedEscalationModal>
      >;
    });

    // ---------------------------------------------------------------------------
    // Assignee picker (embedded in both investigation and escalation flyout headers)
    // ---------------------------------------------------------------------------
    const LazyConnectedAssignees = makeLazyWithProviders(async () => {
      const { ConnectedAssignees } = await import(
        './components/connected_assignees/connected_assignees'
      );
      return ConnectedAssignees as React.ComponentType<
        React.ComponentProps<typeof ConnectedAssignees>
      >;
    });

    // ---------------------------------------------------------------------------
    // Linked investigations list (escalation flyout overview tab body)
    // ---------------------------------------------------------------------------
    const LazyConnectedLinkedInvestigations = makeLazyWithProviders(async () => {
      const { ConnectedLinkedInvestigations } = await import(
        './components/connected_linked_investigations/connected_linked_investigations'
      );
      return ConnectedLinkedInvestigations as React.ComponentType<
        React.ComponentProps<typeof ConnectedLinkedInvestigations>
      >;
    });

    const { manageEscalations: canManageEscalations, showEscalations: canShowEscalations } =
      getAgenticInvestigationsCapabilities(core.application.capabilities);

    // ---------------------------------------------------------------------------
    // renderAssignees render prop — shared by both templates
    // ---------------------------------------------------------------------------
    const renderAssignees: RenderAssignees = (props) =>
      React.createElement(
        EscalationModalBoundary,
        null,
        React.createElement(LazyConnectedAssignees, props)
      );

    // ---------------------------------------------------------------------------
    // renderLinkedInvestigations render prop — escalation overview tab
    // ---------------------------------------------------------------------------
    const renderLinkedInvestigations: RenderLinkedInvestigations = (props) =>
      React.createElement(
        EscalationModalBoundary,
        { loadingLabel: LINKED_INVESTIGATIONS_LOADING_LABEL },
        React.createElement(LazyConnectedLinkedInvestigations, props)
      );

    registerAgenticInvestigationTemplateUI({
      conversationTemplates: startDeps.agentBuilder.conversationTemplates,
      templateId: TEMPLATE_ID_INVESTIGATION,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'securitySignalDetected',
      renderAssignees,
      renderEscalationModal: canManageEscalations
        ? (props) =>
            React.createElement(
              EscalationModalBoundary,
              null,
              React.createElement(LazyEscalationModal, props)
            )
        : undefined,
    });

    registerEscalationTemplateUI({
      conversationTemplates: startDeps.agentBuilder.conversationTemplates,
      templateId: TEMPLATE_ID_ESCALATION,
      name: ESCALATION_TEMPLATE_NAME,
      icon: 'warning',
      renderAssignees,
      renderLinkedInvestigations: canShowEscalations ? renderLinkedInvestigations : undefined,
    });

    return {};
  }

  public stop() {}
}
