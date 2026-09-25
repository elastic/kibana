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
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { Subject, filter, take, type Subscription } from 'rxjs';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  ALERTZERO_ENABLED_SETTING_ID,
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_ESCALATION,
} from '@kbn/alertzero-common';
import React from 'react';
import {
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
  type RenderAssignees,
  type RenderStatus,
  type CloseInvestigationModalRenderProps,
  type RenderLinkedInvestigations,
} from '@kbn/agentic-investigations-common';
import { getAgenticInvestigationsCapabilities } from './hooks/use_agentic_investigations_capabilities';
import { getAlertZeroDeepLinks } from './deep_links';
import { registerAlertZeroAttachmentTypesUI } from './agent_builder/attachment_types';
import { EscalationModalBoundary } from './pages/conversations/escalation_modal_boundary';
import { ProposedActionsBoundary } from './pages/conversations/proposed_actions_boundary';
import { getSharedAppQueryClient } from './shared_app_query_client';
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
  private templateRegistration?: Subscription;
  private statusSubscription?: Subscription;
  private readonly logger: Logger;
  /**
   * Allows `start()` to push updated deep links (with capability-resolved visibility)
   * after capabilities become available, without re-registering the application.
   */
  private readonly appUpdater$ = new Subject<AppUpdater>();

  constructor(context: PluginInitializerContext<AlertZeroClientConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPublicStart>,
    _setupDeps: AlertZeroSetupDependencies
  ): AlertZeroPublicSetup {
    if (!this.config.enabled) {
      return { enabled: false };
    }

    coreSetup.application.register({
      id: ALERTZERO_APP_ID,
      title: APP_TITLE,
      appRoute: ALERTZERO_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'securitySignalDetected',
      // Inaccessible until the per-space setting is on. Core then empties `visibleIn` and
      // `deepLinks` for us, which is what removes the AlertZero nodes from the Security
      // navigation tree — those trees hold no check of their own.
      status: AppStatus.inaccessible,
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

    return { enabled: true };
  }

  public start(core: CoreStart, startDeps: AlertZeroStartDependencies): AlertZeroPublicStart {
    if (!this.config.enabled) {
      return {};
    }

    // Push capability-resolved deep links now that `core.application.capabilities` is available.
    this.appUpdater$.next(() => ({
      deepLinks: getAlertZeroDeepLinks(core.application.capabilities),
    }));

    // Reactively gate the app status on the per-space setting so toggling it makes the app
    // accessible/inaccessible without a reload.
    this.statusSubscription = core.uiSettings
      .get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false)
      .subscribe((settingEnabled) => {
        this.appUpdater$.next(() => ({
          status: settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
          deepLinks: getAlertZeroDeepLinks(core.application.capabilities),
        }));
      });

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

    // Lazy-loaded for the same reason as the escalation modal above: the proposals hooks (React
    // Query, the HTTP client) stay out of alertzero's main chunk until the flyout's overview tab
    // actually renders its "Proposed actions" section.
    //
    // Shares `getSharedAppQueryClient()` with the queue page (`application.tsx`) rather than
    // creating its own — see https://github.com/elastic/kibana/pull/292946#discussion_r4092473937.
    // Both read and decide the same proposals; an isolated client here would let a decision made
    // in one leave the other showing it as still pending.
    const LazyProposedActionsSlot = React.lazy(async () => {
      const [
        { KibanaContextProvider },
        { QueryClientProvider },
        { ProposedActionsSlot },
        queryClient,
      ] = await Promise.all([
        import('@kbn/kibana-react-plugin/public'),
        import('@kbn/react-query'),
        import('./pages/conversations/proposed_actions_slot'),
        getSharedAppQueryClient(),
      ]);

      const stableServices = { ...core, ...startDeps };

      const WrappedSlot: React.FC<React.ComponentProps<typeof ProposedActionsSlot>> = (props) =>
        React.createElement(
          KibanaContextProvider,
          { services: stableServices },
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(ProposedActionsSlot, props)
          )
        );

      return { default: WrappedSlot };
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
    // Status toggle (embedded in both investigation and escalation flyout headers)
    // ---------------------------------------------------------------------------
    const LazyConnectedStatusToggle = makeLazyWithProviders(async () => {
      const { ConnectedStatusToggle } = await import(
        './components/connected_status/connected_status_toggle'
      );
      return ConnectedStatusToggle as React.ComponentType<
        React.ComponentProps<typeof ConnectedStatusToggle>
      >;
    });

    // ---------------------------------------------------------------------------
    // Close investigation modal (used from the flyout footer and queue card actions)
    // ---------------------------------------------------------------------------
    const LazyConnectedCloseInvestigationModal = makeLazyWithProviders(async () => {
      const { ConnectedCloseInvestigationModal } = await import(
        './components/connected_status/connected_close_investigation_modal'
      );
      return ConnectedCloseInvestigationModal as React.ComponentType<
        React.ComponentProps<typeof ConnectedCloseInvestigationModal>
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

    const {
      manageEscalations: canManageEscalations,
      manageInvestigations: canManageInvestigations,
      showEscalations: canShowEscalations,
    } = getAgenticInvestigationsCapabilities(core.application.capabilities);

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
    // renderStatus render prop — shared by both templates
    // ---------------------------------------------------------------------------
    const renderStatus: RenderStatus = (props) =>
      React.createElement(
        EscalationModalBoundary,
        null,
        React.createElement(LazyConnectedStatusToggle, props)
      );

    // ---------------------------------------------------------------------------
    // renderCloseInvestigationModal — flyout footer close action
    // ---------------------------------------------------------------------------
    const renderCloseInvestigationModal = canManageInvestigations
      ? (props: CloseInvestigationModalRenderProps) =>
          React.createElement(
            EscalationModalBoundary,
            null,
            React.createElement(LazyConnectedCloseInvestigationModal, props)
          )
      : undefined;

    // ---------------------------------------------------------------------------
    // renderLinkedInvestigations render prop — escalation overview tab
    // ---------------------------------------------------------------------------
    const renderLinkedInvestigations: RenderLinkedInvestigations = (props) =>
      React.createElement(
        EscalationModalBoundary,
        { loadingLabel: LINKED_INVESTIGATIONS_LOADING_LABEL },
        React.createElement(LazyConnectedLinkedInvestigations, props)
      );

    // The template registration API has no deregistration counterpart, so this is one-shot: we
    // register on the first `true` and cannot remove the entry if the setting is later disabled.
    // The setting is therefore registered with `requiresPageReload`, so disabling it prompts for a
    // reload and the next session starts without the registration.
    //
    // Errors from registerAgenticInvestigationTemplateUI are re-raised as unhandled rejections
    // so they surface in the browser console and unhandledrejection listeners, rather than
    // being silently swallowed by RxJS's global error handler.
    this.templateRegistration = core.uiSettings
      .get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false)
      .pipe(filter(Boolean), take(1))
      .subscribe({
        next: () => {
          try {
            registerAgenticInvestigationTemplateUI({
              conversationTemplates: startDeps.agentBuilder.conversationTemplates,
              templateId: TEMPLATE_ID_INVESTIGATION,
              name: INVESTIGATION_TEMPLATE_NAME,
              icon: 'securitySignalDetected',
              renderAssignees,
              renderStatus: canManageInvestigations ? renderStatus : undefined,
              renderCloseInvestigationModal,
              renderEscalationModal: canManageEscalations
                ? (props) =>
                    React.createElement(
                      EscalationModalBoundary,
                      null,
                      React.createElement(LazyEscalationModal, props)
                    )
                : undefined,
              renderProposedActions: (props) =>
                React.createElement(
                  ProposedActionsBoundary,
                  null,
                  React.createElement(LazyProposedActionsSlot, props)
                ),
            });

            registerEscalationTemplateUI({
              conversationTemplates: startDeps.agentBuilder.conversationTemplates,
              templateId: TEMPLATE_ID_ESCALATION,
              name: ESCALATION_TEMPLATE_NAME,
              icon: 'warning',
              renderAssignees,
              renderStatus: canManageEscalations && canManageInvestigations ? renderStatus : undefined,
              renderLinkedInvestigations: canShowEscalations
                ? renderLinkedInvestigations
                : undefined,
            });
          } catch (err) {
            return Promise.reject(err);
          }
        },
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
      },
    }).catch((error) => {
      this.logger.error('Failed to register AlertZero attachment UI definitions', error);
    });

    return {};
  }

  public stop() {
    this.statusSubscription?.unsubscribe();
    this.templateRegistration?.unsubscribe();
  }
}
